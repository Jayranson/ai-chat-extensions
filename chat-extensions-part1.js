// Part 1 - Start
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Chat extensions loaded');
        enhanceButtonStyling();
        enhanceLiveIndicator();
        fixContextMenuFunctionality();
        enhanceWhisperFunctionality();
        
        setTimeout(() => {
            showNotification('Chat enhancements activated', 'success');
        }, 1000);
    });
    
    function addCSS(cssText) {
        const style = document.createElement('style');
        style.textContent = cssText;
        document.head.appendChild(style);
    }
    
    function enhanceButtonStyling() {
        addCSS(`
            .action-button {
                padding: 8px 12px;
                background-color: #4a5568;
                color: white;
                border: none;
                border-radius: 4px;
                margin-left: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                transition: background-color 0.2s;
            }
            
            .action-button:hover {
                background-color: #2d3748;
            }
            
            .action-button i {
                margin-right: 5px;
            }
            
            .leave-btn, #leaveRoomBtn {
                background-color: #e53e3e;
            }
            
            .leave-btn:hover, #leaveRoomBtn:hover {
                background-color: #c53030;
            }
            
            .send-button, #sendMessageBtn {
                background-color: #4299e1;
                color: white;
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .send-button:hover, #sendMessageBtn:hover {
                background-color: #3182ce;
            }
        `);
        
        const roomSettingsBtn = document.getElementById('roomSettingsBtn');
        if (roomSettingsBtn) {
            roomSettingsBtn.className = roomSettingsBtn.className + ' action-button';
            roomSettingsBtn.innerHTML = '<i class="fas fa-cog"></i> Room Settings';
        }
        
        const leaveRoomBtn = document.getElementById('leaveRoomBtn');
        if (leaveRoomBtn) {
            leaveRoomBtn.className = leaveRoomBtn.className + ' action-button leave-btn';
            leaveRoomBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Leave Room';
        }
        
        const sendMessageBtn = document.getElementById('sendMessageBtn');
        if (sendMessageBtn) {
            sendMessageBtn.className = 'send-button';
            sendMessageBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }
    
    function enhanceLiveIndicator() {
        let liveIndicator = document.getElementById('liveIndicator');
        
        if (!liveIndicator) {
            liveIndicator = document.createElement('div');
            liveIndicator.id = 'liveIndicator';
            document.body.appendChild(liveIndicator);
        }
        
        liveIndicator.innerHTML = '<span class="pulse"></span> LIVE';
        liveIndicator.className = 'live-indicator';
        
        addCSS(`
            .live-indicator {
                display: flex;
                align-items: center;
                background-color: rgba(0, 0, 0, 0.5);
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                position: fixed;
                top: 10px;
                right: 10px;
                font-size: 12px;
                z-index: 9999;
                opacity: 1;
                transition: opacity 0.5s;
            }
            
            .live-indicator.fade {
                opacity: 0;
            }
            
            .pulse {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #ff3b30;
                margin-right: 5px;
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.3; }
                100% { opacity: 1; }
            }
        `);
        
        setTimeout(() => {
            liveIndicator.classList.add('fade');
        }, 5000);
    }
    
    function fixContextMenuFunctionality() {
        let contextMenu = document.getElementById('contextMenu');
        
        if (!contextMenu) {
            contextMenu = document.createElement('div');
            contextMenu.id = 'contextMenu';
            contextMenu.className = 'context-menu';
            contextMenu.innerHTML = `
                <div class="context-option" data-action="whisper">Whisper</div>
                <div class="context-option" data-action="viewProfile">View Profile</div>
                <div class="context-option" data-action="mute">Mute</div>
                <div class="context-option" data-action="block">Block</div>
                <div class="context-option" data-action="kick">Kick</div>
                <div class="context-option" data-action="ban">Ban</div>
            `;
            document.body.appendChild(contextMenu);
            
            addCSS(`
                .context-menu {
                    position: absolute;
                    background-color: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    display: none;
                    z-index: 1000;
                }
                
                .context-option {
                    padding: 8px 12px;
                    cursor: pointer;
                }
                
                .context-option:hover {
                    background-color: #f7fafc;
                }
            `);
        }
        
        const clonedContextMenu = contextMenu.cloneNode(true);
        contextMenu.parentNode.replaceChild(clonedContextMenu, contextMenu);
        contextMenu = clonedContextMenu;
        
        const whisperOption = contextMenu.querySelector('.context-option[data-action="whisper"]');
        const profileOption = contextMenu.querySelector('.context-option[data-action="viewProfile"]');
        const muteOption = contextMenu.querySelector('.context-option[data-action="mute"]');
        const blockOption = contextMenu.querySelector('.context-option[data-action="block"]');
        const kickOption = contextMenu.querySelector('.context-option[data-action="kick"]');
        const banOption = contextMenu.querySelector('.context-option[data-action="ban"]');
        
        let selectedUser = null;
        
        function addContextMenuHandlers() {
            document.querySelectorAll('.user-item').forEach(item => {
                item.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    
                    const userId = this.getAttribute('data-user-id');
                    const username = this.getAttribute('data-username');
                    selectedUser = {
                        id: userId,
                        username: username
                    };
                    
                    contextMenu.style.display = 'block';
                    contextMenu.style.left = `${e.pageX}px`;
                    contextMenu.style.top = `${e.pageY}px`;
                    
                    const currentUser = getCurrentUser();
                    const isAdmin = currentUser && currentUser.roles && 
                        (currentUser.roles.includes('admin') || currentUser.roles.includes('owner'));
                    const isRoomOwner = currentUser && window.currentRoom && 
                        window.currentRoom.owner === currentUser.id;
                    const isRoomHost = currentUser && window.currentRoom && 
                        window.currentRoom.hosts && window.currentRoom.hosts.includes(currentUser.id);
                    
                    if (kickOption) {
                        kickOption.style.display = (isAdmin || isRoomOwner || isRoomHost) ? 'block' : 'none';
                    }
                    
                    if (banOption) {
                        banOption.style.display = (isAdmin || isRoomOwner || isRoomHost) ? 'block' : 'none';
                    }
                });
            });
        }
        
        addContextMenuHandlers();
        
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    addContextMenuHandlers();
                }
            });
        });
        
        const membersList = document.getElementById('membersList');
        if (membersList) {
            observer.observe(membersList, { childList: true, subtree: true });
        }
        
        document.addEventListener('click', function() {
            contextMenu.style.display = 'none';
        });
        
        if (whisperOption) {
            whisperOption.addEventListener('click', function() {
                if (!selectedUser) return;
                openWhisperWindow(selectedUser);
                contextMenu.style.display = 'none';
            });
        }
        
        if (profileOption) {
            profileOption.addEventListener('click', function() {
                if (!selectedUser) return;
                window.location.href = `/profile?id=${selectedUser.id}`;
                contextMenu.style.display = 'none';
            });
        }
        
        if (muteOption) {
            muteOption.addEventListener('click', function() {
                if (!selectedUser) return;
                
                const currentUser = getCurrentUser();
                if (!currentUser) return;
                
                let mutedUsers = JSON.parse(localStorage.getItem('mutedUsers') || '[]');
                
                if (!mutedUsers.includes(selectedUser.id)) {
                    mutedUsers.push(selectedUser.id);
                    localStorage.setItem('mutedUsers', JSON.stringify(mutedUsers));
                    showNotification(`You have muted ${selectedUser.username}`, 'info');
                } else {
                    showNotification(`${selectedUser.username} is already muted`, 'info');
                }
                
                contextMenu.style.display = 'none';
            });
        }
        
        if (blockOption) {
            blockOption.addEventListener('click', function() {
                if (!selectedUser) return;
                
                const currentUser = getCurrentUser();
                if (!currentUser) return;
                
                fetch(`/api/users/block`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ userId: selectedUser.id })
                })
                .then(response => {
                    if (!response.ok) throw new Error('Failed to block user');
                    return response.json();
                })
                .then(data => {
                    showNotification(`You have blocked ${selectedUser.username}`, 'info');
                })
                .catch(error => {
                    console.error('Error blocking user:', error);
                    showNotification('Failed to block user. Please try again.', 'error');
                });
                
                contextMenu.style.display = 'none';
            });
        }
        
        if (kickOption) {
            kickOption.addEventListener('click', function() {
                if (!selectedUser || !window.currentRoom) return;
                
                const reason = prompt(`Reason for kicking ${selectedUser.username}:`);
                if (reason === null) return;
                
                const message = `/kick ${selectedUser.username} ${reason}`;
                sendMessage(message, window.currentRoom.id);
                
                contextMenu.style.display = 'none';
            });
        }
        
        if (banOption) {
            banOption.addEventListener('click', function() {
                if (!selectedUser || !window.currentRoom) return;
                
                const reason = prompt(`Reason for banning ${selectedUser.username}:`);
                if (reason === null) return;
                
                const message = `/ban ${selectedUser.username} ${reason}`;
                sendMessage(message, window.currentRoom.id);
                
                contextMenu.style.display = 'none';
            });
        }
    }
    
    function enhanceWhisperFunctionality() {
        let whisperContainer = document.getElementById('whisperWindows');
        if (!whisperContainer) {
            whisperContainer = document.createElement('div');
            whisperContainer.id = 'whisperWindows';
            document.body.appendChild(whisperContainer);
            
            addCSS(`
                #whisperWindows {
                    position: fixed;
                    bottom: 10px;
                    right: 10px;
                    z-index: 1000;
                    display: flex;
                    flex-direction: column-reverse;
                    gap: 10px;
                }
                
                .whisper-window {
                    width: 300px;
                    height: 300px;
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    resize: both;
                    min-width: 250px;
                    min-height: 200px;
                    max-width: 500px;
                    max-height: 500px;
                }
                
                .whisper-header {
                    padding: 8px 12px;
                    background-color: #4a5568;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                }
                
                .whisper-title {
                    font-weight: bold;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .whisper-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 18px;
                }
                
                .whisper-messages {
                    flex: 1;
                    padding: 12px;
                    overflow-y: auto;
                    background-color: #f7fafc;
                }
                
                .whisper-input-container {
                    display: flex;
                    border-top: 1px solid #e2e8f0;
                    padding: 8px;
                }
                
                .whisper-input {
                    flex: 1;
                    padding: 8px;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                    resize: none;
                    height: 36px;
                }
                
                .whisper-send {
                    background-color: #4299e1;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 0 12px;
                    margin-left: 8px;
                    cursor: pointer;
                }
                
                .whisper-message {
                    margin-bottom: 8px;
                    padding: 8px 12px;
                    border-radius: 8px;
                    max-width: 80%;
                    word-break: break-word;
                }
                
                .whisper-message.sent {
                    background-color: #c6f6d5;
                    align-self: flex-end;
                    margin-left: auto;
                }
                
                .whisper-message.received {
                    background-color: #e2e8f0;
                    align-self: flex-start;
                }
                
                .whisper-timestamp {
                    font-size: 10px;
                    color: #718096;
                    margin-top: 4px;
                    text-align: right;
                }
            `);
        }
// Part 1 - End