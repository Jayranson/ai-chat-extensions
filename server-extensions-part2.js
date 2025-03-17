// Part 2 - Start
    // ==========================================
    // AI CHAT COMMANDS AND RESPONSES
    // ==========================================
    const aiCommands = {
        // Help command
        help: {
            description: 'Shows a list of available commands',
            adminOnly: false,
            handler: (user, room, args) => {
                const userRoles = getUserRoles(user.id);
                const commands = Object.entries(aiCommands)
                    .filter(([_, cmd]) => !cmd.adminOnly || 
                        (userRoles.includes('admin') || userRoles.includes('owner') || 
                         (room && (room.owner === user.id || room.hosts.includes(user.id)))))
                    .map(([name, cmd]) => `/${name} - ${cmd.description}`);
                
                return {
                    message: `Available commands:\n${commands.join('\n')}`,
                    sender: 'AI Assistant'
                };
            }
        },
        
        // Toggle AI in the room
        ai: {
            description: 'Toggles the AI assistant in the current room (admin/host/owner only)',
            adminOnly: true,
            handler: (user, room, args) => {
                if (!room) return { message: 'You must be in a room to use this command', sender: 'System' };
                
                // Check if user has permission
                const userRoles = getUserRoles(user.id);
                if (!userRoles.includes('admin') && !userRoles.includes('owner') && 
                    room.owner !== user.id && !room.hosts.includes(user.id)) {
                    return { message: 'You do not have permission to use this command', sender: 'System' };
                }
                
                // Toggle AI setting
                room.settings.aiEnabled = !room.settings.aiEnabled;
                
                return {
                    message: `AI assistant is now ${room.settings.aiEnabled ? 'enabled' : 'disabled'} in this room`,
                    sender: 'System'
                };
            }
        },
        
        // Make AI say something
        say: {
            description: 'Makes the AI say something (admin/host/owner only)',
            adminOnly: true,
            handler: (user, room, args) => {
                if (!room) return { message: 'You must be in a room to use this command', sender: 'System' };
                if (!args || args.length === 0) {
                    return { message: 'Usage: /say [message]', sender: 'System' };
                }
                
                broadcastToRoom(room.id, {
                    type: 'message',
                    sender: {
                        id: 'ai-assistant',
                        username: 'AI Assistant',
                        isAI: true
                    },
                    message: args.join(' '),
                    timestamp: Date.now()
                });
                
                return { message: 'Message sent through AI', sender: 'System' };
            }
        },
        
        // Kick a user
        kick: {
            description: 'Kicks a user from the room (host/owner only)',
            adminOnly: true,
            handler: (user, room, args) => {
                if (!room) return { message: 'You must be in a room to use this command', sender: 'System' };
                if (!args || args.length === 0) {
                    return { message: 'Usage: /kick [username] [reason]', sender: 'System' };
                }
                
                const username = args[0];
                const reason = args.slice(1).join(' ') || 'No reason provided';
                
                // Find target user
                const targetUser = connectedUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
                if (!targetUser) {
                    return { message: `User ${username} not found`, sender: 'System' };
                }
                
                // Check if user is in the room
                if (!room.members.includes(targetUser.id)) {
                    return { message: `User ${username} is not in this room`, sender: 'System' };
                }
                
                // Remove user from the room
                room.members = room.members.filter(id => id !== targetUser.id);
                
                // Send kick message to the target user
                targetUser.socket.send(JSON.stringify({
                    type: 'kicked',
                    roomId: room.id,
                    roomName: room.name,
                    reason: reason
                }));
                
                // Broadcast kick to room
                broadcastToRoom(room.id, {
                    type: 'user_kicked',
                    username: targetUser.username,
                    reason: reason,
                    by: user.username
                });
                
                return {
                    message: `${targetUser.username} has been kicked from the room. Reason: ${reason}`,
                    sender: 'AI Assistant'
                };
            }
        },
        
        // Ban a user
        ban: {
            description: 'Bans a user from the room (host/owner only)',
            adminOnly: true,
            handler: (user, room, args) => {
                if (!room) return { message: 'You must be in a room to use this command', sender: 'System' };
                if (!args || args.length === 0) {
                    return { message: 'Usage: /ban [username] [reason]', sender: 'System' };
                }
                
                const username = args[0];
                const reason = args.slice(1).join(' ') || 'No reason provided';
                
                // Find target user
                const targetUser = connectedUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
                if (!targetUser) {
                    return { message: `User ${username} not found`, sender: 'System' };
                }
                
                // Check if user is in the room
                if (!room.members.includes(targetUser.id)) {
                    return { message: `User ${username} is not in this room`, sender: 'System' };
                }
                
                // Add to banned users
                if (!room.bannedUsers) room.bannedUsers = [];
                room.bannedUsers.push(targetUser.id);
                
                // Remove user from the room
                room.members = room.members.filter(id => id !== targetUser.id);
                
                // Send ban message to the target user
                targetUser.socket.send(JSON.stringify({
                    type: 'banned',
                    roomId: room.id,
                    roomName: room.name,
                    reason: reason
                }));
                
                // Broadcast ban to room
                broadcastToRoom(room.id, {
                    type: 'user_banned',
                    username: targetUser.username,
                    reason: reason,
                    by: user.username
                });
                
                return {
                    message: `${targetUser.username} has been banned from the room. Reason: ${reason}`,
                    sender: 'AI Assistant'
                };
            }
        },
        
        // Mute a user
        mute: {
            description: 'Mutes a user in the room for a specified duration (host/owner only)',
            adminOnly: true,
            handler: (user, room, args) => {
                if (!room) return { message: 'You must be in a room to use this command', sender: 'System' };
                if (!args || args.length < 2) {
                    return { message: 'Usage: /mute [username] [duration in minutes] [reason]', sender: 'System' };
                }
                
                const username = args[0];
                const duration = parseInt(args[1]);
                const reason = args.slice(2).join(' ') || 'No reason provided';
                
                if (isNaN(duration) || duration <= 0) {
                    return { message: 'Duration must be a positive number of minutes', sender: 'System' };
                }
                
                // Find target user
                const targetUser = connectedUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
                if (!targetUser) {
                    return { message: `User ${username} not found`, sender: 'System' };
                }
                
                // Check if user is in the room
                if (!room.members.includes(targetUser.id)) {
                    return { message: `User ${username} is not in this room`, sender: 'System' };
                }
                
                // Add to muted users
                if (!room.mutedUsers) room.mutedUsers = {};
                const muteEndTime = Date.now() + (duration * 60 * 1000);
                room.mutedUsers[targetUser.id] = muteEndTime;
                
                // Send mute notification to the target user
                targetUser.socket.send(JSON.stringify({
                    type: 'muted',
                    roomId: room.id,
                    roomName: room.name,
                    duration: duration,
                    reason: reason,
                    endTime: muteEndTime
                }));
                
                // Broadcast mute to room
                broadcastToRoom(room.id, {
                    type: 'user_muted',
                    username: targetUser.username,
                    duration: duration,
                    reason: reason,
                    by: user.username
                });
                
                // Set timeout to unmute
                setTimeout(() => {
                    if (room.mutedUsers && room.mutedUsers[targetUser.id]) {
                        delete room.mutedUsers[targetUser.id];
                        
                        // Notify user and room if user is still connected
                        const stillConnected = connectedUsers.find(u => u.id === targetUser.id);
                        if (stillConnected) {
                            stillConnected.socket.send(JSON.stringify({
                                type: 'unmuted',
                                roomId: room.id,
                                roomName: room.name
                            }));
                            
                            broadcastToRoom(room.id, {
                                type: 'user_unmuted',
                                username: targetUser.username
                            });
                        }
                    }
                }, duration * 60 * 1000);
                
                return {
                    message: `${targetUser.username} has been muted for ${duration} minutes. Reason: ${reason}`,
                    sender: 'AI Assistant'
                };
            }
        },
        
        // Send message to all AIs in all rooms
        aiall: {
            description: 'Sends a message through all AI assistants in all rooms (admin only)',
            adminOnly: true,
            handler: (user, room, args) => {
                // Check if user is an admin
                const userRoles = getUserRoles(user.id);
                if (!userRoles.includes('admin') && !userRoles.includes('owner')) {
                    return { message: 'You do not have permission to use this command', sender: 'System' };
                }
                
                if (!args || args.length === 0) {
                    return { message: 'Usage: /aiall [message]', sender: 'System' };
                }
                
                const message = args.join(' ');
                
                // Broadcast to all rooms
                rooms.forEach(r => {
                    // Only broadcast to rooms where AI is enabled
                    if (r.settings.aiEnabled) {
                        broadcastToRoom(r.id, {
                            type: 'message',
                            sender: {
                                id: 'ai-assistant',
                                username: 'AI Assistant',
                                isAI: true
                            },
                            message: message,
                            timestamp: Date.now()
                        });
                    }
                });
                
                return { 
                    message: 'Message broadcast through all AI assistants in all active rooms', 
                    sender: 'System' 
                };
            }
        },
        
        // Entertainment commands
        joke: {
            description: 'Makes the AI tell a joke',
            adminOnly: false,
            handler: (user, room, args) => {
                if (!room) return { message: 'You must be in a room to use this command', sender: 'System' };
                
                // Array of family-friendly jokes
                const jokes = [
                    "Why don't scientists trust atoms? Because they make up everything!",
                    "I told my wife she was drawing her eyebrows too high. She looked surprised.",
                    "Why did the scarecrow win an award? Because he was outstanding in his field!",
                    "I'm reading a book about anti-gravity. It's impossible to put down!",
                    "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them.",
                    "Why did the bicycle fall over? Because it was two-tired!",
                    "What's the best thing about Switzerland? I don't know, but the flag is a big plus.",
                    "How do you organize a space party? You planet!",
                    "Why did the coffee file a police report? It got mugged.",
                    "What do you call a fake noodle? An impasta!"
                ];
                
                // Select a random joke
                const joke = jokes[Math.floor(Math.random() * jokes.length)];
                
                broadcastToRoom(room.id, {
                    type: 'message',
                    sender: {
                        id: 'ai-assistant',
                        username: 'AI Assistant',
                        isAI: true
                    },
                    message: joke,
                    timestamp: Date.now()
                });
                
                return null; // No direct response
            }
        },
        
        // 8-ball prediction command
        "8ball": {
            description: "Ask the magic 8-ball a question",
            adminOnly: false,
            handler: (user, room, args) => {
                if (!room) return { message: 'You must be in a room to use this command', sender: 'System' };
                if (!args || args.length === 0) {
                    return { message: 'Usage: /8ball [your question]', sender: 'System' };
                }
                
                const responses = [
                    "It is certain.",
                    "It is decidedly so.",
                    "Without a doubt.",
                    "Yes definitely.",
                    "You may rely on it.",
                    "As I see it, yes.",
                    "Most likely.",
                    "Outlook good.",
                    "Yes.",
                    "Signs point to yes.",
                    "Reply hazy, try again.",
                    "Ask again later.",
                    "Better not tell you now.",
                    "Cannot predict now.",
                    "Concentrate and ask again.",
                    "Don't count on it.",
                    "My reply is no.",
                    "My sources say no.",
                    "Outlook not so good.",
                    "Very doubtful."
                ];
                
                const question = args.join(' ');
                const response = responses[Math.floor(Math.random() * responses.length)];
                
                broadcastToRoom(room.id, {
                    type: 'message',
                    sender: {
                        id: 'ai-assistant',
                        username: 'AI Assistant',
                        isAI: true
                    },
                    message: `**Q: ${question}**\n🎱 ${response}`,
                    timestamp: Date.now()
                });
                
                return null; // No direct response
            }
        },
        
        // Close a room (admin or owner only)
        closeroom: {
            description: 'Closes the current room and removes all users (admin/owner only)',
            adminOnly: true,
            handler: (user, room, args) => {
                if (!room) return { message: 'You must be in a room to use this command', sender: 'System' };
                
                // Check if user has permission
                const userRoles = getUserRoles(user.id);
                if (!userRoles.includes('admin') && !userRoles.includes('owner') && room.owner !== user.id) {
                    return { message: 'You do not have permission to use this command', sender: 'System' };
                }
                
                const reason = args && args.length > 0 ? args.join(' ') : 'No reason provided';
                
                // Notify all room members
                room.members.forEach(memberId => {
                    const member = connectedUsers.find(u => u.id === memberId);
                    if (member) {
                        member.socket.send(JSON.stringify({
                            type: 'room_closed',
                            roomId: room.id,
                            roomName: room.name,
                            reason: reason,
                            by: user.username
                        }));
                    }
                });
                
                // Remove the room
                const roomIndex = rooms.findIndex(r => r.id === room.id);
                if (roomIndex !== -1) {
                    rooms.splice(roomIndex, 1);
                }
                
                // Broadcast room removal to all users
                broadcastToAll({
                    type: 'room_removed',
                    roomId: room.id,
                    reason: reason
                });
                
                return { message: 'Room has been closed successfully', sender: 'System' };
            }
        }
    };
    
    // ==========================================
    // PROCESS COMMANDS AND WEBSOCKET HANDLER
    // ==========================================
    
    // Process commands in messages
    function processCommand(message, user, roomId) {
        if (!message.startsWith('/')) return null;
        
        const parts = message.substring(1).split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        // Find the room user is in
        const room = rooms.find(r => r.id === roomId);
        
        // Get command handler
        const commandHandler = aiCommands[command];
        if (!commandHandler) {
            return {
                message: `Unknown command: /${command}. Type /help for available commands.`,
                sender: 'System'
            };
        }
        
        // Check permissions
        if (commandHandler.adminOnly) {
            const userRoles = getUserRoles(user.id);
            const isRoomOwnerOrHost = room && (room.owner === user.id || room.hosts.includes(user.id));
            
            if (!userRoles.includes('admin') && !userRoles.includes('owner') && !isRoomOwnerOrHost) {
                return {
                    message: 'You do not have permission to use this command',
                    sender: 'System'
                };
            }
        }
        
        // Execute command
        return commandHandler.handler(user, room, args);
    }
    
    // Helper function to get user roles
    function getUserRoles(userId) {
        // In a real implementation, this would query the database
        // Here we'll use a basic way to check user roles
        const user = connectedUsers.find(u => u.id === userId);
        return user && user.roles ? user.roles : [];
    }
    
    // Handle WebSocket connection
    function setupWebSocket(server) {
        const WebSocket = require('ws');
        const wss = new WebSocket.Server({ server });
        
        wss.on('connection', (socket, req) => {
            // Extract token from query string
            const url = new URL(req.url, 'http://localhost');
            const token = url.searchParams.get('token');
            
            if (!token) {
                socket.close(4000, 'Authentication required');
                return;
            }
            
            // Validate token and get user info
            // In a real implementation, you'd verify the JWT token
            // For now, we'll assume the token is valid and contains user info
            try {
                // Mock user verification - replace with actual JWT verification
                const userId = 'user-' + Math.random().toString(36).substring(7);
                const username = 'User' + Math.floor(Math.random() * 1000);
                
                // Add user to connected users
                const userConnection = {
                    id: userId,
                    username: username,
                    socket: socket,
                    roles: ['user'] // Default role
                };
                
                connectedUsers.push(userConnection);
                
                // Send successful connection
                socket.send(JSON.stringify({
                    type: 'connected',
                    user: {
                        id: userId,
                        username: username
                    }
                }));
                
                // Handle messages
                socket.on('message', (data) => {
                    try {
                        const message = JSON.parse(data);
                        handleMessage(message, userConnection);
                    } catch (e) {
                        console.error('Error parsing message:', e);
                    }
                });
                
                // Handle disconnection
                socket.on('close', () => {
                    // Remove user from all rooms
                    rooms.forEach(room => {
                        if (room.members.includes(userId)) {
                            leaveRoom(userId, room.id);
                        }
                    });
                    
                    // Remove user from connected users
                    const userIndex = connectedUsers.findIndex(u => u.id === userId);
                    if (userIndex !== -1) {
                        connectedUsers.splice(userIndex, 1);
                    }
                    
                    console.log(`User ${username} disconnected`);
                });
                
            } catch (e) {
                console.error('Authentication error:', e);
                socket.close(4001, 'Authentication failed');
            }
        });
    }
    
    // Handle incoming messages
    function handleMessage(message, user) {
        switch (message.type) {
            case 'message':
                // Regular chat message
                if (message.roomId) {
                    const room = rooms.find(r => r.id === message.roomId);
                    if (!room) return;
                    
                    // Check if user is in the room
                    if (!room.members.includes(user.id)) return;
                    
                    // Check if user is muted
                    if (room.mutedUsers && room.mutedUsers[user.id] && room.mutedUsers[user.id] > Date.now()) {
                        const muteTimeRemaining = Math.ceil((room.mutedUsers[user.id] - Date.now()) / 60000);
                        
                        user.socket.send(JSON.stringify({
                            type: 'error',
                            message: `You are muted for ${muteTimeRemaining} more minute(s)`
                        }));
                        
                        return;
                    }
                    
                    // Check if message is a command
                    if (message.content.startsWith('/')) {
                        const commandResult = processCommand(message.content, user, message.roomId);
                        
                        if (commandResult) {
                            // Send command response back to user
                            user.socket.send(JSON.stringify({
                                type: 'command_response',
                                message: commandResult.message,
                                sender: commandResult.sender
                            }));
                        }
                        return;
                    }
                    
                    // Check for slow mode
                    if (room.settings.slowMode) {
                        const lastMessageTime = user.lastMessageTime && user.lastMessageTime[room.id];
                        const currentTime = Date.now();
                        const slowModeDelay = room.settings.slowModeDelay * 1000; // convert to ms
                        
                        if (lastMessageTime && (currentTime - lastMessageTime) < slowModeDelay) {
                            const waitTime = Math.ceil((slowModeDelay - (currentTime - lastMessageTime)) / 1000);
                            
                            user.socket.send(JSON.stringify({
                                type: 'error',
                                message: `Slow mode is enabled. Please wait ${waitTime} seconds before sending another message.`
                            }));
                            
                            return;
                        }
                        
                        // Update last message time
                        if (!user.lastMessageTime) user.lastMessageTime = {};
                        user.lastMessageTime[room.id] = currentTime;
                    }
                    
                    // Process and broadcast message to room
                    broadcastToRoom(message.roomId, {
                        type: 'message',
                        sender: {
                            id: user.id,
                            username: user.username,
                            avatar: user.avatar
                        },
                        message: message.content,
                        timestamp: Date.now()
                    });
                    
                    // Have AI respond occasionally (if enabled)
                    if (room.settings.aiEnabled && Math.random() < 0.1) { // 10% chance
                        setTimeout(() => {
                            const aiResponses = [
                                "That's an interesting point!",
                                "I see what you mean.",
                                "Thanks for sharing that.",
                                "I'm following the conversation with interest.",
                                "That's worth thinking about further.",
                                "Great discussion everyone!"
                            ];
                            
                            const response = aiResponses[Math.floor(Math.random() * aiResponses.length)];
                            
                            broadcastToRoom(message.roomId, {
                                type: 'message',
                                sender: {
                                    id: 'ai-assistant',
                                    username: 'AI Assistant',
                                    isAI: true
                                },
                                message: response,
                                timestamp: Date.now()
                            });
                        }, 2000 + Math.random() * 3000); // 2-5 second delay
                    }
                }
                break;
                
            case 'whisper':
                // Handle whisper messages
                if (message.targetId && message.content) {
                    handleWhisper(user, message.targetId, message.content);
                }
                break;
                
            case 'create_room':
                // Handle room creation
                if (message.roomData) {
                    const newRoom = createRoom(user.id, message.roomData);
                    
                    if (newRoom) {
                        user.socket.send(JSON.stringify({
                            type: 'room_created',
                            room: {
                                id: newRoom.id,
                                name: newRoom.name,
                                description: newRoom.description,
                                memberCount: 1,
                                isPrivate: newRoom.isPrivate
                            }
                        }));
                    }
                }
                break;
                
            case 'update_room_settings':
                // Handle room settings update
                if (message.roomId && message.settings) {
                    const result = updateRoomSettings(message.roomId, message.settings, user.id);
                    
                    user.socket.send(JSON.stringify({
                        type: 'room_settings_update_result',
                        success: result.success,
                        message: result.message
                    }));
                }
                break;
                
            case 'join_room':
                // Handle join room request
                if (message.roomId) {
                    const result = joinRoom(user.id, message.roomId, message.password);
                    
                    user.socket.send(JSON.stringify({
                        type: 'join_room_result',
                        roomId: message.roomId,
                        success: result.success,
                        message: result.message
                    }));
                    
                    if (result.success) {
                        // Broadcast user joined to room
                        broadcastToRoom(message.roomId, {
                            type: 'user_joined',
                            user: {
                                id: user.id,
                                username: user.username,
                                avatar: user.avatar
                            }
                        });
                    }
                }
                break;
                
            case 'leave_room':
                // Handle leave room request
                if (message.roomId) {
                    leaveRoom(user.id, message.roomId);
                    
                    user.socket.send(JSON.stringify({
                        type: 'leave_room_result',
                        roomId: message.roomId,
                        success: true
                    }));
                }
                break;
        }
    }
    
    // Initialize WebSocket connection
    setupWebSocket(server);
    
    // ==========================================
    // EXPORT FUNCTIONS FOR SERVER INTEGRATION
    // ==========================================
    return {
        handleWhisper,
        createRoom,
        updateRoomSettings,
        joinRoom,
        leaveRoom,
        broadcastToRoom,
        broadcastToAll,
        processCommand,
        getUserRoles,
        handleMessage,
        rooms,
        connectedUsers,
        aiCommands
    };
};
// Part 2 - End