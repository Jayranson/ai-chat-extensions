// Part 1 - Start
/**
 * AI Chat Network - Server Extensions
 * 
 * This module adds AI commands and room management functionality
 * without modifying the original server code.
 */

module.exports = function(app, io, server) {
    // Global references to track server state
    const rooms = [];
    const connectedUsers = [];
    
    // Helper function to generate unique IDs
    function generateId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    
    // ==========================================
    // USER-TO-USER WHISPERS
    // ==========================================
    function handleWhisper(sender, targetId, message) {
        const targetUser = connectedUsers.find(user => user.id === targetId);
        
        if (!targetUser) {
            // Target user not found
            sender.socket.send(JSON.stringify({
                type: 'error',
                message: 'User not found or offline'
            }));
            return;
        }
        
        // Send whisper to target user
        targetUser.socket.send(JSON.stringify({
            type: 'whisper',
            from: {
                id: sender.id,
                username: sender.username,
                avatar: sender.avatar
            },
            message: message
        }));
        
        // Confirm to sender
        sender.socket.send(JSON.stringify({
            type: 'whisper_sent',
            to: {
                id: targetUser.id,
                username: targetUser.username
            },
            message: message
        }));
    }
    
    // ==========================================
    // ROOM MANAGEMENT FUNCTIONS
    // ==========================================
    function createRoom(userId, roomData) {
        const user = connectedUsers.find(u => u.id === userId);
        if (!user) return null;
        
        const roomId = `room-${generateId()}`;
        const newRoom = {
            id: roomId,
            name: roomData.name,
            description: roomData.description,
            capacity: roomData.capacity || 50,
            isPrivate: roomData.isPrivate || false,
            password: roomData.password || null,
            owner: userId,
            hosts: [userId],
            members: [userId],
            created: Date.now(),
            settings: {
                allowGuests: roomData.allowGuests || true,
                moderated: roomData.moderated || false,
                aiEnabled: roomData.aiEnabled !== undefined ? roomData.aiEnabled : true,
                slowMode: roomData.slowMode || false,
                slowModeDelay: roomData.slowModeDelay || 5
            }
        };
        
        rooms.push(newRoom);
        
        // Add user to the room
        joinRoom(userId, roomId);
        
        // Broadcast room creation to all users
        broadcastToAll({
            type: 'room_created',
            room: {
                id: newRoom.id,
                name: newRoom.name,
                description: newRoom.description,
                memberCount: 1,
                isPrivate: newRoom.isPrivate
            }
        });
        
        return newRoom;
    }
    
    function updateRoomSettings(roomId, settings, userId) {
        const room = rooms.find(r => r.id === roomId);
        
        if (!room) {
            return { success: false, message: 'Room not found' };
        }
        
        // Check if user has permission (owner or host)
        if (room.owner !== userId && !room.hosts.includes(userId)) {
            return { success: false, message: 'Permission denied' };
        }
        
        // Update room settings
        room.settings = { ...room.settings, ...settings };
        room.name = settings.name || room.name;
        room.description = settings.description || room.description;
        room.isPrivate = settings.isPrivate !== undefined ? settings.isPrivate : room.isPrivate;
        room.password = settings.password || room.password;
        
        // Broadcast the update to all room members
        broadcastToRoom(roomId, {
            type: 'room_updated',
            roomId: roomId,
            settings: room.settings,
            name: room.name,
            description: room.description
        });
        
        return { success: true, message: 'Room settings updated' };
    }
    
    function joinRoom(userId, roomId, password = null) {
        const user = connectedUsers.find(u => u.id === userId);
        const room = rooms.find(r => r.id === roomId);
        
        if (!user || !room) {
            return { success: false, message: 'User or room not found' };
        }
        
        // Check if room is full
        if (room.members.length >= room.capacity) {
            return { success: false, message: 'Room is full' };
        }
        
        // Check if user is banned
        if (room.bannedUsers && room.bannedUsers.includes(userId)) {
            return { success: false, message: 'You are banned from this room' };
        }
        
        // Check password for private rooms
        if (room.isPrivate && room.password && room.password !== password) {
            return { success: false, message: 'Incorrect password' };
        }
        
        // Add user to room if not already a member
        if (!room.members.includes(userId)) {
            room.members.push(userId);
        }
        
        // Send room data to user
        user.socket.send(JSON.stringify({
            type: 'room_joined',
            room: {
                id: room.id,
                name: room.name,
                description: room.description,
                members: room.members.map(memberId => {
                    const member = connectedUsers.find(u => u.id === memberId);
                    return member ? {
                        id: member.id,
                        username: member.username,
                        avatar: member.avatar,
                        isOwner: room.owner === memberId,
                        isHost: room.hosts.includes(memberId)
                    } : null;
                }).filter(m => m !== null)
            }
        }));
        
        return { success: true, message: 'Joined room successfully' };
    }
    
    function leaveRoom(userId, roomId) {
        const room = rooms.find(r => r.id === roomId);
        if (!room) return false;
        
        // Remove user from room members
        room.members = room.members.filter(id => id !== userId);
        
        // Broadcast to room that user left
        broadcastToRoom(roomId, {
            type: 'user_left',
            userId: userId
        });
        
        // Check if room is empty
        if (room.members.length === 0) {
            // Remove empty room
            const roomIndex = rooms.findIndex(r => r.id === roomId);
            if (roomIndex !== -1) {
                rooms.splice(roomIndex, 1);
            }
            
            // Broadcast room removal
            broadcastToAll({
                type: 'room_removed',
                roomId: roomId
            });
        } else if (room.owner === userId) {
            // If owner left, assign a new owner from hosts
            const newOwner = room.hosts.find(id => id !== userId && room.members.includes(id));
            if (newOwner) {
                room.owner = newOwner;
                
                // Broadcast owner change
                broadcastToRoom(roomId, {
                    type: 'owner_changed',
                    roomId: roomId,
                    newOwnerId: newOwner
                });
            } else {
                // If no hosts left, assign first member as owner
                if (room.members.length > 0) {
                    room.owner = room.members[0];
                    room.hosts.push(room.members[0]);
                    
                    // Broadcast owner change
                    broadcastToRoom(roomId, {
                        type: 'owner_changed',
                        roomId: roomId,
                        newOwnerId: room.members[0]
                    });
                }
            }
        }
        
        return true;
    }
    
    // ==========================================
    // BROADCASTING FUNCTIONS
    // ==========================================
    function broadcastToRoom(roomId, message) {
        const room = rooms.find(r => r.id === roomId);
        if (!room) return;
        
        room.members.forEach(memberId => {
            const user = connectedUsers.find(u => u.id === memberId);
            if (user && user.socket) {
                user.socket.send(JSON.stringify(message));
            }
        });
    }
    
    function broadcastToAll(message) {
        connectedUsers.forEach(user => {
            if (user.socket) {
                user.socket.send(JSON.stringify(message));
            }
        });
    }
// Part 1 - End