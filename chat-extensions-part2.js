// Part 2 - Start
    window.openWhisperWindow = function(user) {
        const existingWindow = document.getElementById(`whisper-${user.id}`);
        if (existingWindow) {
            existingWindow.style.opacity = '1';
            existingWindow.querySelector('.whisper-input').focus();
            return;
        }
        
        const whisperWindow = document.createElement('div');
        whisperWindow.id = `whisper-${user.id}`;
        whisperWindow.className = 'whisper-window';
        whisperWindow.dataset.userId = user.id;
        whisperWindow.dataset.username = user.username;
        
        whisperWindow.innerHTML = `
            <div class="whisper-header">
                <div class="whisper-title">Whisper: ${user.username}</div>
                <button class="whisper-close">&times;</button>
            </div>
            <div class="whisper-messages"></div>
            <div class="whisper-input-container">
                <textarea class="whisper-input" placeholder="Type your message..."></textarea>
                <button class="whisper-send">Send</button>
            </div>
        `;
        
        document.getElementById('whisperWindows').appendChild(whisperWindow);
        
        makeWhisperWindowDraggable(whisperWindow);
        
        const closeBtn = whisperWindow.querySelector('.whisper-close');
        const sendBtn = whisperWindow.querySelector('.whisper-send');
        const input = whisperWindow.querySelector('.whisper-input');
        
        closeBtn.addEventListener('click', () => {
            whisperWindow.remove();
        });
        
        sendBtn.addEventListener('click', () => {
            sendWhisperMessage(user.id, input.value.trim());
            input.value = '';
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });
        
        input.focus();
    };
    
    window.sendWhisperMessage = function(targetId, message) {
        if (!message) return;
        
        const whisperWindow = document.getElementById(`whisper-${targetId}`);
        if (!whisperWindow) return;
        
        const messagesContainer = whisperWindow.querySelector('.whisper-messages');
        
        const messageElement = document.createElement('div');
        messageElement.className = 'whisper-message sent';
        
        const timestamp = new Date();
        const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div>${message}</div>
            <div class="whisper-timestamp">${timeString}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        const socket = getWebSocketConnection();
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'whisper',
                targetId: targetId,
                content: message
            }));
        } else {
            showNotification('Not connected to server. Whisper not sent.', 'error');
        }
    };
    
    window.receiveWhisperMessage = function(fromUser, message) {
        let whisperWindow = document.getElementById(`whisper-${fromUser.id}`);
        if (!whisperWindow) {
            openWhisperWindow(fromUser);
            whisperWindow = document.getElementById(`whisper-${fromUser.id}`);
            
            playNotificationSound();
        }
        
        const messagesContainer = whisperWindow.querySelector('.whisper-messages');
        
        const messageElement = document.createElement('div');
        messageElement.className = 'whisper-message received';
        
        const timestamp = new Date();
        const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div>${message}</div>
            <div class="whisper-timestamp">${timeString}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        if (document.visibilityState !== 'visible') {
            showBrowserNotification(`New whisper from ${fromUser.username}`, message);
        }
    };
    
    function makeWhisperWindowDraggable(window) {
        const header = window.querySelector('.whisper-header');
        let isDragging = false;
        let offsetX, offsetY;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - window.getBoundingClientRect().left;
            offsetY = e.clientY - window.getBoundingClientRect().top;
            window.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            
            const maxX = document.documentElement.clientWidth - window.offsetWidth;
            const maxY = document.documentElement.clientHeight - window.offsetHeight;
            
            window.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
            window.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                window.style.cursor = '';
            }
        });
    }
    
    function fixAdminDisplayInRoomList() {
        window.updateRoomMembers = function(roomId, members) {
            const membersList = document.getElementById('membersList');
            if (!membersList) return;
            
            membersList.innerHTML = '';
            
            const processedMembers = new Set();
            
            members.forEach(member => {
                if (processedMembers.has(member.id)) return;
                processedMembers.add(member.id);
                
                const memberItem = document.createElement('div');
                memberItem.className = 'user-item';
                memberItem.dataset.userId = member.id;
                memberItem.dataset.username = member.username;
                
                let roleIcon = '';
                if (member.isOwner) roleIcon = '<span class="role-icon owner">⭐</span>';
                else if (member.isHost) roleIcon = '<span class="role-icon host">🛡️</span>';
                
                if (member.roles && (member.roles.includes('admin') || member.roles.includes('owner'))) {
                    roleIcon = '<span class="role-icon admin">👑</span>';
                    memberItem.dataset.isAdmin = 'true';
                }
                
                memberItem.innerHTML = `
                    <div class="user-avatar">
                        <img src="${member.avatar || '/img/default-avatar.png'}" alt="${member.username}">
                        <span class="user-status ${member.status || 'online'}"></span>
                    </div>
                    <div class="user-info">
                        <div class="user-name">${roleIcon} ${member.username}</div>
                    </div>
                `;
                
                membersList.appendChild(memberItem);
            });
        };
    }
    
    function showNotification(message, type = 'info') {
        let liveIndicator = document.getElementById('liveIndicator');
        if (!liveIndicator) {
            liveIndicator = document.createElement('div');
            liveIndicator.id = 'liveIndicator';
            liveIndicator.className = 'live-indicator';
            document.body.appendChild(liveIndicator);
        }
        
        let icon = '';
        switch (type) {
            case 'success': icon = '✅'; break;
            case 'error': icon = '❌'; break;
            case 'warning': icon = '⚠️'; break;
            case 'info': icon = 'ℹ️'; break;
            default: icon = '🔔';
        }
        
        liveIndicator.innerHTML = `<span class="pulse"></span> ${icon} ${message}`;
        liveIndicator.className = 'live-indicator';
        
        if (window.liveIndicatorTimeout) {
            clearTimeout(window.liveIndicatorTimeout);
        }
        
        window.liveIndicatorTimeout = setTimeout(() => {
            liveIndicator.classList.add('fade');
        }, 5000);
    }
    
    function playNotificationSound() {
        const audio = new Audio('/audio/notification.mp3');
        audio.play().catch(err => console.error('Error playing notification sound:', err));
    }
    
    function showBrowserNotification(title, body) {
        if (!("Notification" in window)) return;
        
        if (Notification.permission === "granted") {
            new Notification(title, { body: body });
        } 
        else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification(title, { body: body });
                }
            });
        }
    }
    
    function getCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        if (!userData) return null;
        
        try {
            return JSON.parse(userData);
        } catch (e) {
            console.error('Error parsing current user data:', e);
            return null;
        }
    }
    
    function getToken() {
        return localStorage.getItem('token');
    }
    
    function getWebSocketConnection() {
        return window.webSocket || null;
    }
    
    function sendMessage(message, roomId) {
        if (!message || !roomId) return;
        
        const socket = getWebSocketConnection();
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'message',
                roomId: roomId,
                content: message
            }));
        } else {
            showNotification('Not connected to server. Message not sent.', 'error');
        }
    }
    
    function setupWebSocketHandler() {
        // Intercept WebSocket messages to handle whispers
        const originalWebSocketProto = WebSocket.prototype;
        const originalAddEventListener = originalWebSocketProto.addEventListener;
        
        originalWebSocketProto.addEventListener = function(type, listener, options) {
            if (type === 'message') {
                const wrappedListener = function(event) {
                    try {
                        const data = JSON.parse(event.data);
                        
                        // Handle whisper messages
                        if (data.type === 'whisper' && data.from && data.message) {
                            receiveWhisperMessage(data.from, data.message);
                            return; // Don't pass to original listener
                        }
                        
                        // Store current room reference if available
                        if (data.type === 'room_joined' && data.room) {
                            window.currentRoom = data.room;
                        }
                    } catch (e) {
                        console.error('Error processing WebSocket message:', e);
                    }
                    
                    // Call original listener
                    listener.call(this, event);
                };
                
                return originalAddEventListener.call(this, type, wrappedListener, options);
            }
            
            return originalAddEventListener.call(this, type, listener, options);
        };
    }
})();
// Part 2 - End