
let selectedUserId = null;
let currentUserId = null;
let currentUserName = null;
let selectedUserName = null;
const socket = io.connect("http://localhost:3000");

// Get all necessary elements
const videoCallBtn = document.getElementById('videoCallBtn');
const voiceCallBtn = document.getElementById('voiceCallBtn');
const callScreen = document.getElementById('callScreen');
const hangUpBtn = document.getElementById('hangUpBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Function to remove string after space (for user name)
function removeStringAfterSpace(str) {
  const index = str.indexOf(' ');
  return index !== -1 ? str.substring(0, index) : str;
}

// Join the user's room on page load
window.addEventListener('DOMContentLoaded', async function () {
  const token = localStorage.getItem('jwtToken');

  if (!token) {
    window.location.href = 'index.html';
  }

  try {
    const response = await fetch('http://localhost:3000/api/users/current', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const user = await response.json();
      currentUserId = user._id;
      currentUserName = user.name;
      document.getElementById('user').innerText = removeStringAfterSpace(user.name);
      document.getElementById('profilePhoto').src = user.avatar || '../user.png';

      // Join the user's room
      socket.emit('joinRoom', currentUserId, currentUserName);
      socket.emit('loadChatUsers', currentUserId);
    } else {
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    window.location.href = 'index.html';
  }
});

document.querySelectorAll('#chatBtn').forEach((btn)=>{
  btn.addEventListener('click',()=>{
    socket.emit('loadChatUsers', currentUserId);
  })
})

// Handle contact button clicks to load contacts
const contactBtn = document.querySelectorAll('#contactBtn');

contactBtn.forEach(element => {
  element.addEventListener('click', async () => {
   
    const contactList = document.getElementById('contactList');
    const contactMain = document.querySelector('.contact-main');
    const token = localStorage.getItem('jwtToken');

    try {
      const response = await fetch('http://localhost:3000/api/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users. Status: ' + response.status);
      }

      const users = await response.json();
      contactList.style.display = 'block';
      contactList.innerHTML = '';

      if (users.length === 0) {
        contactList.innerHTML = '<p>No contacts found, add contacts</p>';
      } else {
        const fragment = document.createDocumentFragment();

        users.forEach(user => {
          const contactDiv = document.createElement('div');
          contactDiv.className = 'contact';
          contactDiv.setAttribute('data-user-id', user._id);
          contactDiv.setAttribute('data-user-name', user.name);
          contactDiv.setAttribute('data-avatar', user.avatar || '../user.png');
          contactDiv.innerHTML = `
            <img src="${user.avatar || '../user.png'}" class="rounded-circle me-2" alt="Contact" width="50" height="50"/>
            <div>
              <h6 class="mb-0">${user.name}</h6>
              <small>${user.status}</small>
            </div>
          `;

          contactDiv.addEventListener('click', () => {
           const chatWindow = document.getElementById("chatWindow");
           const Welcome = document.getElementById("Welcome");
           Welcome.classList.add("d-none")
            chatWindow.classList.remove("d-none")
            selectedUserId = user._id;
            selectedUserName = user.name;
            showChatWindow(user);

            // Emit 'loadMessages' when a contact is selected
            socket.emit('loadMessages', {
              currentUserId: currentUserId,
              selectedUserId: selectedUserId,
            });
            socket.emit('loadChatUsers', currentUserId);
          });

          fragment.appendChild(contactDiv);
        });

        contactList.appendChild(fragment);
      }

      document.getElementById('username').innerText = 'Contacts';
      contactMain.appendChild(contactList);
    } catch (error) {
      console.error('Error fetching users:', error);
      contactList.innerHTML = '<p>Error fetching contacts. Please try again later.</p>';
    }
  });
});


// Sending a message
document.getElementById('btn-paper-plane').addEventListener('click', () => {
  const messageInput = document.getElementById('inputMessage');
  const message = messageInput.value;

  if (message.trim()) {
    socket.emit('sendMessage', {
      senderId: currentUserId,
      receiverId: selectedUserId,
      message: message,
      timestamp:Date.now()
    });

    // Display the message in the chat window (sender side)
    displayMessage(currentUserId, message);

    messageInput.value = '';  // Clear the input box
  }
});

// Display a message in the chat window
function displayMessage(userId, message, timestamp=Date.now() , isHistory = false) {
  const chatMessages = document.querySelector('.chat-messages');
  const messageDiv = document.createElement('div');

  // Determine if the message is sent or received
  messageDiv.className = userId === currentUserId ? 'msgOut' : 'msgIn';

  // Use the provided timestamp instead of the current date
  const formattedTime = formatTimestamp(new Date(timestamp));

  // Create message content
  const messageContent = `
    <div class="message ${userId === currentUserId ? 'sent' : 'received'} mb-3">
      ${message}
      <div class="msg-info">
        <span>${formattedTime}</span>
        <span class="fa-stack">
          ${userId === currentUserId ? '<i class="fa-solid fa-check-double"></i>' : ''}
        </span>
      </div>
    </div>
  `;

  messageDiv.innerHTML = messageContent;

  // Append the message
  if (isHistory) {
    chatMessages.insertBefore(messageDiv, chatMessages.firstChild); // Older messages at the top
  } else {
    chatMessages.appendChild(messageDiv); // Newer messages at the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;  // Auto-scroll to the bottom
  }
}


// Receiving a message
socket.on('receiveMessage', ({ senderId, message, timestamp }) => {
  // If the message is from the currently active chat
  if (senderId === selectedUserId) {
    // Display the message in the chat window
    displayMessage(senderId, message, timestamp);
    updateContactList(senderId, message, timestamp);
  } else {
    // Update the contact list with the new message
    updateContactList(senderId, message, timestamp);
  }
});

// Handling chat history loading
socket.on('loadMessages', (messages) => {
  const chatMessages = document.querySelector('.chat-messages');
  chatMessages.innerHTML = ''; // Clear chat window

  messages.forEach(msg => {
    displayMessage(msg.sender, msg.message,msg.timestamp, true); // Pass 'true' for chat history
  });

  chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the bottom
});


// Listening for chatUsersLoaded event from the server
socket.on('chatUsersLoaded', (chatUsers) => {
  const contactList = document.getElementById('contactList');
  contactList.innerHTML = ''; // Clear existing contacts

  if (chatUsers.length === 0) {
    contactList.innerHTML = '<p>No chat contacts found</p>';
  } else {
    const fragment = document.createDocumentFragment();

    // Iterate through the users and create contact list
    chatUsers.forEach(chatUser => {
      const user = chatUser.user;
      const lastMessage = chatUser.lastMessage;
      const timestamp = formatTimestamp(new Date(chatUser.lastTimestamp)); // Use the formatTimestamp function

      const contactDiv = document.createElement('div');
      contactDiv.className = 'contact';
      contactDiv.setAttribute('data-user-id', user._id);
      contactDiv.setAttribute('data-user-name', user.name);
      contactDiv.setAttribute('data-avatar', user.avatar || '../user.png');

      contactDiv.innerHTML = `
        <img src="${user.avatar || '../user.png'}" class="rounded-circle me-2" alt="Contact" width="50" height="50"/>
        <div>
          <h6 class="mb-0">${user.name}</h6>
          <small class="small1">${lastMessage}</small>
          <small class="small">${timestamp}</small>
        </div>
      `;
      const unreadCount = chatUser.unreadCount; 
      if (unreadCount > 0) {
        document.querySelector(`[data-user-id="${chatUser.user._id}"] .unread-count`).innerText = unreadCount;
      }

      // Add event listener to load messages when the user clicks on a contact
      contactDiv.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar')
        const chatWindow = document.getElementById('chatWindow')
        chatWindow.classList.remove("d-none")
        const Welcome = document.getElementById("Welcome");
        Welcome.classList.add("d-none")
        const chatMessages = document.querySelector('.chat-messages')
        chatMessages.classList.add('toggle-window') 
        const navbar = document.getElementById('navbar')
        chatWindow.classList.add('toggle-window') 
        sidebar.classList.add('toggle-sidebar')
        navbar.classList.add('toggle-sidebar')
        selectedUserId = user._id;
        selectedUserName = user.name;
        showChatWindow(user); // Display chat header and avatar
        // Fetch and load the chat messages for the selected user
        socket.emit('loadMessages', {
          currentUserId,
          selectedUserId
        });
      });

      fragment.appendChild(contactDiv);
    });

    contactList.appendChild(fragment);
  }
});
// send message as read
socket.emit('markMessagesAsRead', {
  senderId: selectedUserId,
  receiverId: currentUserId,
});
// date to format the timestamp
function formatTimestamp(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const formattedHours = hours % 12 || 12; // Convert 24-hour format to 12-hour
  return `${formattedHours}:${minutes} ${ampm}`;
}

// Display the selected user's chat window (already existing)
function showChatWindow(user) {
  const chatWindow = document.querySelector('.chat-window');
  chatWindow.querySelector('.chat-header img').src = user.avatar || '../user.png';
  chatWindow.querySelector('.chat-header h5').innerText = user.name;
  chatWindow.querySelector('.chat-messages').innerHTML = ''; // Clear existing messages
}
// function to update contacts if new received
function updateContactList(senderId, message, timestamp) {
  // Find the contact div of the sender
  const contactDiv = document.querySelector(`.contact[data-user-id="${senderId}"]`);

  if (contactDiv) {
    // Update the last message and timestamp in the contact list
    const smallText = contactDiv.querySelector('small');
    const timestampText = contactDiv.querySelector('.small');

    smallText.innerText = message; // Update last message
    timestampText.innerText = formatTimestamp(new Date(timestamp)); // Update timestamp
  }
}

socket.on('updateUserStatus', ({ userId, status }) => {
  const userElement = document.querySelector(`[data-user-id="${userId}"]`);
  if (userElement) {
    const statusElement = userElement.querySelector('.status');
    statusElement.classList.remove('online', 'offline');
    statusElement.classList.add(status);
    statusElement.innerHTML = status === 'online' ? 'Online' : 'Offline';
  }
});

document.getElementById("backBtn").addEventListener('click',()=>{
  const sidebar = document.getElementById('sidebar')
  const chatWindow = document.getElementById('chatWindow')
  const chatMessages = document.querySelector('.chat-messages')
  chatMessages.classList.remove('toggle-window') 
  const navbar = document.getElementById('navbar')
  chatWindow.classList.remove('toggle-window') 
  sidebar.classList.remove('toggle-sidebar')
  navbar.classList.remove('toggle-sidebar')
})
// WebRTC Variables
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let callAccepted = false;
let callTimeout = null;
let isBusy = false;  // Track if the user is currently in a call
let isVoiceCall = false; // Track if it's a voice call
const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Browser compatibility check
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  alert('Your browser does not support WebRTC. Please try a modern browser like Chrome or Firefox.');
}

function showErrorMessage(message) {
  console.error(message);
  alert(`Error: ${message}`);
}

// Helper to start media
async function startMedia(isVoice) {
  try {
    if (isVoice) {
      // Request only audio stream for voice call
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } else {
      // Request video + audio stream for video call
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;  // Attach to video element if it's a video call
    }
  } catch (error) {
    showErrorMessage("Unable to access media devices. Please ensure your microphone is available.");
    throw error;
  }
}

// Event Listener for Video Call Button
videoCallBtn.addEventListener('click', async () => {
  if (!selectedUserId || !currentUserName || isBusy) return;
  isVoiceCall = false;  // This is a video call
  callScreen.style.display = 'flex';
  document.getElementById('blackScreen').classList.remove('d-none');

  try {
    await startMedia(false);  // Start video and audio media
    socket.emit("call-user", selectedUserId, currentUserName);
    
    // Set a 20-second timeout for the call request
    callTimeout = setTimeout(() => {
      socket.emit("call-timeout", selectedUserId);  // Notify the server of timeout
      endCall();
      alert("Call request timed out.");
    }, 20000);  // 20 seconds
  } catch (error) {
    showErrorMessage("Failed to start video call: " + error);
  }
});

// Event Listener for Voice Call Button
voiceCallBtn.addEventListener('click', async () => {
  if (!selectedUserId || !currentUserName || isBusy) return;
  isVoiceCall = true;  // This is a voice call
  callScreen.style.display = 'flex';
  document.getElementById('blackScreen').classList.remove('d-none');
  localVideo.style.display = 'none';  // Hide video element during voice call

  try {
    await startMedia(true);  // Start audio-only media
    socket.emit("call-user", selectedUserId, currentUserName);
    
    // Set a 20-second timeout for the call request
    callTimeout = setTimeout(() => {
      socket.emit("call-timeout", selectedUserId);  // Notify the server of timeout
      endCall();
      alert("Call request timed out.");
    }, 20000);  // 20 seconds
  } catch (error) {
    showErrorMessage("Failed to start voice call: " + error);
  }
});

// Incoming call notification
socket.on("incoming-call", async ({ from }) => {
  if (isBusy) {
    // If the user is busy, notify the caller
    socket.emit("user-busy", { target: from });
    return;
  }
  
  const accept = confirm(`${from} is calling you. Do you want to accept?`);
  if (accept) {
    clearTimeout(callTimeout);  // Clear timeout if call is accepted
    const callType = isVoiceCall ? true : false;  // Identify call type (voice or video)
    await startMedia(callType);
    socket.emit("accept-call", currentUserId, selectedUserId);
    initializePeerConnection(selectedUserId);
  } else {
    // If the call is rejected, notify the caller
    socket.emit("reject-call", selectedUserId);
    endCall();
  }
});

// Call rejected handler
socket.on("call-rejected", () => {
  alert("The user rejected the call.");
  endCall();
});

// Call timeout handler (from the server)
socket.on("call-timeout", () => {
  alert("The call request timed out.");
  endCall();
});

// User busy handler
socket.on("user-busy", () => {
  alert("The user is currently in another call.");
});

// Call accepted handler
socket.on("call-accepted", async () => {
  clearTimeout(callTimeout);  // Clear timeout if call is accepted
  const callType = isVoiceCall ? true : false;  // Identify call type (voice or video)
  await startMedia(callType);
  initializePeerConnection(selectedUserId);
});

// Initialize peer connection
function initializePeerConnection(targetUser) {
  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;  // Attach remote stream to video element
    }
    remoteStream.addTrack(event.track);
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", { candidate: event.candidate, target: targetUser });
    }
  };

  createOffer(targetUser);
}

// Create and send offer
async function createOffer(targetUser) {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", { offer, target: targetUser });
}

// Handle incoming offer
socket.on("offer", async ({ offer, from }) => {
  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;  // Attach remote stream to video element
    }
    remoteStream.addTrack(event.track);
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", { candidate: event.candidate, target: from });
    }
  };

  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", { answer, from });
});

// Handle ICE candidates
socket.on("ice-candidate", async (candidate) => {
  if (peerConnection) {
    await peerConnection.addIceCandidate(candidate);
  }
});

// Event Listener for Hang Up Button
hangUpBtn.addEventListener('click', () => {
  socket.emit("hangup", selectedUserId);
  endCall();
});

// Function to end a call
function endCall() {
  callScreen.style.display = 'none';
  document.getElementById('blackScreen').classList.add('d-none');
  
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop());
    remoteStream = null;
  }

  remoteVideo.srcObject = null;
  isBusy = false;
}
