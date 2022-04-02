import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
	addDoc,
	collection,
	doc,
	getDocs,
	increment,
	onSnapshot,
	orderBy,
	query,
	setDoc,
	Timestamp,
	where,
} from 'firebase/firestore';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { db } from '../Firebase/Firebase';
import './Chatbox.css';
// const FieldValue = require('firebase-admin').firestore.FieldValue;
const ChatRoom = ({
	currentReceiverName,
	currentReceiverStatus,
	currentReceiverChatID,
	senderEmail,
}) => {
	// state to store messages of the chatRoom
	const [messages, setMessages] = useState([]);

	// function to get the chatRoom ID on the basis of sender and receiver user id
	const getChatRoomID = () => {
		const usersID = [];

		// push the IDS of the sender and receiver
		usersID.push(currentReceiverChatID);
		usersID.push(senderEmail);

		// sort the userIDs array
		usersID.sort();

		// get the chatRoomID for the given users
		const chatRoomID = usersID[0] + '-' + usersID[1];

		// return the chatRoomID
		return chatRoomID;
	};

	//current message
	const [currentMessage, setCurrentMesssage] = useState('');
	const [currentTime, setCurrentTime] = useState('');

	// get the chatRoomID for the sender and the receiver
	const chatRoomID = getChatRoomID();

	useEffect(() => {
		// make the ChatRoom Query
		const chatRoomQuery = query(
			collection(db, 'chatrooms', chatRoomID, 'messages'),
			orderBy('createdAt')
		);

		const unsubscribe = onSnapshot(chatRoomQuery, (snapshot) => {
			const newMessages = [...messages];
			snapshot.docs.map((change) => {
				console.log(change.type);

				// get the data about the message
				const messageData = change.data();

				// if the senderChatID and uid of the composer of the message is equal
				// then set key to 0
				if (messageData['sentBy'] === senderEmail) {
					messageData['key'] = 0;
				}
				// if unequal then set key to 1
				else {
					messageData['key'] = 1;
				}

				// append the messages into newMessage
				newMessages.push(messageData);
			});

			// update the messages state variable
			setMessages(newMessages);
		});

		return () => {
			unsubscribe();
		};
	}, [currentReceiverChatID, chatRoomID]);

	// function to add a new message into the chatroom
	const addMessage = () => {
		const currentMessageToAdd = {
			_id: new Date().getTime(),
			text: currentMessage,
			sentTo: currentReceiverChatID,
			sentBy: senderEmail,
			createdAt: Timestamp.fromDate(new Date()),
			user: {
				_id: senderEmail,
			},
		};

		// Add the message and store it in the chatRoom messages collection
		addDoc(
			collection(db, 'chatrooms', chatRoomID, 'messages'),
			currentMessageToAdd
		);

		// create the notification Id from the emails of both the users
		const notificationId = senderEmail + '-' + currentReceiverChatID;

		// add the details about the notifications into the FireBase
		setDoc(
			doc(db, 'Notification', notificationId),
			{
				count: increment(1),
				from: senderEmail,
				to: currentReceiverChatID,
			},
			{ merge: true }
		);

		// reset the message input box to empty string
		setCurrentMesssage('');

		return currentMessageToAdd;
	};

	const sendMessage = useCallback(() => {
		const messageToAdd = addMessage();
		messageToAdd['key'] = 0;

		setMessages([...messages, messageToAdd]);
	}, [currentMessage]);

	const onChangeHandler = (e) => {
		setCurrentMesssage(e.target.value);
	};

	useEffect(() => {
		let curr = new Date();
		let time = curr.getTime();
		setCurrentTime(moment(time).format('h:mm a'));
	}, [sendMessage]);

	return (
		<div className='chat'>
			<div className='chat-header clearfix'>
				<div className='row'>
					<div className='col-lg-6'>
						<a
							href='javascript:void(0);'
							data-toggle='modal'
							data-target='#view_info'>
							{/* <img
								src={currentReceiverProfilePhoto}
								alt='avatar'
							/> */}
						</a>
						<div className='chat-about'>
							<div className='mb'>{currentReceiverName}</div>
							<small>
								{currentReceiverStatus !== 'online'
									? 'Last seen: '
									: ''}
								{currentReceiverStatus}
							</small>
						</div>
					</div>
				</div>
			</div>
			<div className='chat-history'>
				<ul className='m-b-0'>
					{messages.map(({ key, text, createdAt, index }) => (
						<li
							key={index}
							class={`clearfix flex-column align-${
								key === 0 ? 'end' : 'start'
							}`}>
							{key === 0 ? (
								<>
									<div class='message other-message float-right'>
										{text}
									</div>
									<div class='message-data align-self-end'>
										<div class='message-data-time'>
											{createdAt
												.toDate()
												.toLocaleString()}
										</div>
									</div>
								</>
							) : (
								<>
									<div class='message my-message float-right align-start'>
										{text}
									</div>
									<div class='message-data align-self-start'>
										<div class='message-data-time'>
											{createdAt
												.toDate()
												.toLocaleString()}
										</div>
									</div>
								</>
							)}
						</li>
					))}
				</ul>
			</div>
			<div className='chat-message clearfix'>
				<div className='input-group mb-0'>
					<div className='input-group-prepend'></div>
					<input
						value={currentMessage}
						type='text'
						className='form-control'
						placeholder='Enter text here...'
						onChange={onChangeHandler}
						onKeyDown={(e) =>
							e.key === 'Enter' ? sendMessage(e) : ''
						}
					/>
					<span className='input-group-text'>
						<i className='fa fa-send' onClick={sendMessage}></i>
					</span>
				</div>
			</div>
		</div>
	);
};

const Chatbox = () => {
	// to display the details of currently opened chat (receiver) in header
	const [currentReceiverName, setCurrentReceiverName] = useState('');
	const [currentReceiverStatus, setCurrentReceiverStatus] = useState('');
	const [currentReceiverProfilePhoto, setCurrentReceiverProfilePhoto] =
		useState('');
	const [currentReceiverChatID, setCurrentReceiverChatID] = useState('');

	// to store the details of the email of the sender
	const [senderEmail, setSenderEmail] = useState('');

	// state to store the chatUsers
	const [chatUsers, setChatUsers] = useState([]);

	// state to store the notifications
	const [notifications, setNotifications] = useState([]);

	// change the state variables when profile of a user is clicked
	const profileButtonClick = (name, status, uid) => {
		console.log('Clicked on another user');
		setCurrentReceiverName(name);
		setCurrentReceiverStatus(status);
		setCurrentReceiverChatID(uid);
	};

	// create FireBase auth object
	const auth = getAuth();

	// run the useEffect to get the uid of the loggedIn user
	useEffect(() => {
		// after successful user login
		onAuthStateChanged(auth, (user) => {
			if (user) {
				// update the state of the senderEmail
				setSenderEmail(user.email);
			}
		});
	}, []);

	useEffect(() => {
		// if the current receiver is empty then do nothing
		if (currentReceiverChatID === '') return;

		// create the notification Id from the emails of both the users
		const notificationId = currentReceiverChatID + '-' + senderEmail;

		// set notification counter to 0 when user clicks on the receiver profile
		setDoc(
			doc(db, 'Notification', notificationId),
			{
				count: 0,
				from: currentReceiverChatID,
				to: senderEmail,
			},
			{ merge: true }
		);
	}, [currentReceiverChatID]);

	useEffect(() => {
		// if senderEmail is not yet fetched then do not make API CALL
		if (senderEmail === '') return;

		// make a query to fetch all the users from the FireBase Backend
		const getAllChatUsersFromFireBase = async () => {
			const chatUsersSnapshot = await getDocs(collection(db, 'Account'));

			// iterate all the docs and just return the document data
			const chatUsersFromFireBase = chatUsersSnapshot.docs.map((doc) => {
				// get the data of the chatUser
				const chatUserData = doc.data();

				// if the status is string then set the value to online
				if (typeof chatUserData.status === 'string') {
					chatUserData.status = 'online';
				}
				// if the status is timestamp type then get the DateObject
				// indicates the user is offline currently and we will display the last seen
				else {
					chatUserData.status = chatUserData.status
						.toDate()
						.toLocaleString();
				}

				// return the chatUserData object
				return chatUserData;
			});

			// keep all the chat users except the loggedInUser
			const chatUsersFromFireBaseWithoutLoggedInUser =
				chatUsersFromFireBase.filter(
					(element) => element.email !== senderEmail
				);

			setChatUsers(chatUsersFromFireBaseWithoutLoggedInUser);
		};

		// make a query to fetch the notifications for all chatrooms of the sender
		const getNotificationForAllChatRooms = async () => {
			// get notifications for all chatrooms of the sender
			const senderNotificationSnapshots = await getDocs(
				query(
					collection(db, 'Notification'),
					where('to', '==', senderEmail)
				)
			);

			// store the notifications in the senderNotifications variable
			const senderNotifications = senderNotificationSnapshots.docs.map(
				(senderNotificationDoc) => {
					return senderNotificationDoc.data();
				}
			);

			// update the state of notifications
			setNotifications(senderNotifications);
		};

		// fetch the chatUsers from the FireBase
		getAllChatUsersFromFireBase();

		// fetch the notifications from the FireBase
		getNotificationForAllChatRooms();

		//  update the state of chatUsers
	}, [senderEmail]);

	// fetch the value of notification
	const getNotificationValue = (email) => {
		// filter the notification object based upon the receiver email
		const receiverNotificationObject = notifications.filter(
			(notification) => notification.from === email
		);

		console.log({ receiverNotificationObject });

		// if object not existed then return 0
		if (receiverNotificationObject.length === 0) {
			return 0;
		}

		// return the notification count from the sender
		return receiverNotificationObject[0]['count'];
	};

	const displayChats = () => {
		if (notifications.length > 0 && chatUsers.length > 0) {
			return (
				<>
					{chatUsers.map(({ name, status, email }) => (
						<li
							className='clearfix'
							onClick={() =>
								profileButtonClick(name, status, email)
							}>
							{/* <img src={pic} alt='avatar' /> */}
							<div className='about'>
								<div className='name'>{name}</div>
								<div className='name'>
									{getNotificationValue(email)}
								</div>
								<div className='status'>
									{' '}
									<i
										className={`fa fa-circle
														${status !== 'online' ? 'offline' : 'online'}`}></i>{' '}
									{status}{' '}
								</div>
							</div>
						</li>
					))}
				</>
			);
		}

		return null;
	};

	console.log(notifications.length);

	return (
		<div className='container-chat-box'>
			<div className='row clearfix'>
				<div className='col-lg-12'>
					<div className='card chat-app'>
						<div id='plist' className='people-list'>
							<div className='input-group mb-0'>
								<input
									type='text'
									className='form-control'
									placeholder='Search...'
								/>
								<span className='input-group-text'>
									<i className='fa fa-search'></i>
								</span>
							</div>
							<ul className='list-unstyled chat-list mt-2 mb-0'>
								{displayChats()}
							</ul>
						</div>

						{chatUsers.map(({ name, status, email }) => {
							if (email === currentReceiverChatID) {
								return (
									<ChatRoom
										currentReceiverName={name}
										currentReceiverStatus={status}
										currentReceiverChatID={email}
										senderEmail={senderEmail}
									/>
								);
							} else {
								return null;
							}
						})}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Chatbox;