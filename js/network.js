// Network module for peer-to-peer multiplayer using PeerJS
console.log('Loading network.js...');

class NetworkManager {
    constructor() {
        this.peer = null;
        this.connections = []; // Array of peer connections
        this.isHost = false;
        this.hostConnection = null; // Client's connection to host
        this.playerId = null;
        this.players = {}; // Map of playerId -> player data
        this.callbacks = {
            onPlayerJoined: null,
            onPlayerLeft: null,
            onGameState: null,
            onPlayerUpdate: null,
            onBallUpdate: null
        };
    }

    // Initialize as host
    initializeHost(hostName = 'Host') {
        return new Promise((resolve, reject) => {
            console.log('Initializing as host...');

            // Generate a random room ID
            const roomId = this.generateRoomId();

            this.peer = new Peer(roomId, {
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                console.log('Host peer opened with ID:', id);
                this.playerId = id;
                this.isHost = true;
                this.players[id] = {
                    id: id,
                    name: hostName,
                    ready: false
                };
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                console.log('Client connecting:', conn.peer);
                this.handleClientConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                reject(err);
            });
        });
    }

    // Initialize as client
    initializeClient(roomId, clientName = 'Player') {
        return new Promise((resolve, reject) => {
            console.log('Connecting to room:', roomId);

            this.peer = new Peer({
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                console.log('Client peer opened with ID:', id);
                this.playerId = id;
                this.isHost = false;

                // Connect to host
                this.hostConnection = this.peer.connect(roomId, { reliable: true });

                this.hostConnection.on('open', () => {
                    console.log('Connected to host!');

                    // Send join message
                    this.sendToHost({
                        type: 'join',
                        playerId: id,
                        playerName: clientName
                    });

                    resolve(id);
                });

                this.hostConnection.on('data', (data) => {
                    this.handleMessage(data, this.hostConnection);
                });

                this.hostConnection.on('close', () => {
                    console.log('Connection to host closed');
                    if (this.callbacks.onPlayerLeft) {
                        this.callbacks.onPlayerLeft(roomId);
                    }
                });

                this.hostConnection.on('error', (err) => {
                    console.error('Connection error:', err);
                    reject(err);
                });
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                reject(err);
            });
        });
    }

    handleClientConnection(conn) {
        this.connections.push(conn);

        conn.on('open', () => {
            console.log('Connection opened with:', conn.peer);
        });

        conn.on('data', (data) => {
            this.handleMessage(data, conn);
        });

        conn.on('close', () => {
            console.log('Connection closed with:', conn.peer);
            this.connections = this.connections.filter(c => c !== conn);
            delete this.players[conn.peer];

            if (this.callbacks.onPlayerLeft) {
                this.callbacks.onPlayerLeft(conn.peer);
            }

            // Broadcast player left to other clients
            if (this.isHost) {
                this.broadcastToClients({
                    type: 'playerLeft',
                    playerId: conn.peer
                });
            }
        });
    }

    handleMessage(data, conn) {
        console.log('Received message:', data.type, data);

        switch (data.type) {
            case 'join':
                if (this.isHost) {
                    // Add player
                    this.players[data.playerId] = {
                        id: data.playerId,
                        name: data.playerName,
                        ready: false
                    };

                    // Send current player list to new player
                    this.sendTo(conn, {
                        type: 'playerList',
                        players: this.players
                    });

                    // Broadcast new player to other clients
                    this.broadcastToClients({
                        type: 'playerJoined',
                        player: this.players[data.playerId]
                    }, conn.peer);

                    if (this.callbacks.onPlayerJoined) {
                        this.callbacks.onPlayerJoined(this.players[data.playerId]);
                    }
                }
                break;

            case 'playerList':
                // Update local player list
                this.players = data.players;
                break;

            case 'playerJoined':
                this.players[data.player.id] = data.player;
                if (this.callbacks.onPlayerJoined) {
                    this.callbacks.onPlayerJoined(data.player);
                }
                break;

            case 'playerLeft':
                delete this.players[data.playerId];
                if (this.callbacks.onPlayerLeft) {
                    this.callbacks.onPlayerLeft(data.playerId);
                }
                break;

            case 'playerReady':
                if (this.players[data.playerId]) {
                    this.players[data.playerId].ready = data.ready;
                }
                break;

            case 'startGame':
                if (this.callbacks.onGameState) {
                    this.callbacks.onGameState('start', data);
                }
                break;

            case 'gameState':
                if (this.callbacks.onGameState) {
                    this.callbacks.onGameState('update', data);
                }
                break;

            case 'playerUpdate':
                if (this.callbacks.onPlayerUpdate) {
                    this.callbacks.onPlayerUpdate(data);
                }
                break;

            case 'ballUpdate':
                if (this.callbacks.onBallUpdate) {
                    this.callbacks.onBallUpdate(data);
                }
                break;

            case 'playerEliminated':
                if (this.callbacks.onGameState) {
                    this.callbacks.onGameState('elimination', data);
                }
                break;

            case 'gameOver':
                if (this.callbacks.onGameState) {
                    this.callbacks.onGameState('gameOver', data);
                }
                break;
        }
    }

    // Send message to host (client only)
    sendToHost(data) {
        if (this.hostConnection && this.hostConnection.open) {
            this.hostConnection.send(data);
        }
    }

    // Send message to specific connection
    sendTo(conn, data) {
        if (conn && conn.open) {
            conn.send(data);
        }
    }

    // Broadcast to all connected clients (host only)
    broadcastToClients(data, excludePeerId = null) {
        if (!this.isHost) return;

        this.connections.forEach(conn => {
            if (conn.open && conn.peer !== excludePeerId) {
                conn.send(data);
            }
        });
    }

    // Broadcast to all players (host or client)
    broadcast(data) {
        if (this.isHost) {
            this.broadcastToClients(data);
        } else {
            this.sendToHost(data);
        }
    }

    setPlayerReady(ready) {
        const message = {
            type: 'playerReady',
            playerId: this.playerId,
            ready: ready
        };

        if (this.isHost) {
            this.players[this.playerId].ready = ready;
            this.broadcastToClients(message);
        } else {
            this.sendToHost(message);
        }
    }

    startGame(gameData) {
        if (!this.isHost) {
            console.warn('Only host can start game');
            return;
        }

        this.broadcastToClients({
            type: 'startGame',
            gameData: gameData
        });
    }

    sendGameState(state) {
        this.broadcast({
            type: 'gameState',
            state: state
        });
    }

    sendPlayerUpdate(playerData) {
        this.broadcast({
            type: 'playerUpdate',
            ...playerData
        });
    }

    sendBallUpdate(ballData) {
        if (!this.isHost) return; // Only host sends ball updates

        this.broadcastToClients({
            type: 'ballUpdate',
            ...ballData
        });
    }

    sendPlayerEliminated(playerId) {
        this.broadcast({
            type: 'playerEliminated',
            playerId: playerId
        });
    }

    sendGameOver(results) {
        if (!this.isHost) return;

        this.broadcastToClients({
            type: 'gameOver',
            results: results
        });
    }

    on(event, callback) {
        if (this.callbacks[event] !== undefined) {
            this.callbacks[event] = callback;
        }
    }

    getPlayerCount() {
        return Object.keys(this.players).length;
    }

    getAllPlayers() {
        return Object.values(this.players);
    }

    allPlayersReady() {
        return this.getAllPlayers().every(p => p.ready);
    }

    generateRoomId() {
        // Generate a 6-character room code
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar-looking chars
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    disconnect() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.connections = [];
        this.players = {};
        this.isHost = false;
        this.hostConnection = null;
    }
}

// Global network manager instance
const networkManager = new NetworkManager();
