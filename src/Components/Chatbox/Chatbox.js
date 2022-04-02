import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import moment from "moment";
import React, { useCallback, useEffect, useState } from "react";
import { db } from "../Firebase/Firebase";
import "./Chatbox.css";
// Hi there 

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
    const chatRoomID = usersID[0] + "-" + usersID[1];

    // return the chatRoomID
    return chatRoomID;
  };

  //current message
  const [currentMessage, setCurrentMesssage] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  // get the chatRoomID for the sender and the receiver
  const chatRoomID = getChatRoomID();

  useEffect(() => {
    // make the ChatRoom Query
    const chatRoomQuery = query(
      collection(db, "chatrooms", chatRoomID, "messages"),
      orderBy("createdAt")
    );

    const unsubscribe = onSnapshot(chatRoomQuery, (snapshot) => {
      const newMessages = [...messages];
      snapshot.docs.map((change) => {
        console.log(change.type);

        // get the data about the message
        const messageData = change.data();

        // if the senderChatID and uid of the composer of the message is equal
        // then set key to 0
        if (messageData["sentBy"] === senderEmail) {
          messageData["key"] = 0;
        }
        // if unequal then set key to 1
        else {
          messageData["key"] = 1;
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
      collection(db, "chatrooms", chatRoomID, "messages"),
      currentMessageToAdd
    );

    // reset the message input box to empty string
    setCurrentMesssage("");

    return currentMessageToAdd;
  };

  const sendMessage = useCallback(() => {
    const messageToAdd = addMessage();
    messageToAdd["key"] = 0;

    setMessages([...messages, messageToAdd]);
  }, [currentMessage]);

  const onChangeHandler = (e) => {
    setCurrentMesssage(e.target.value);
  };

  useEffect(() => {
    let curr = new Date();
    let time = curr.getTime();
    setCurrentTime(moment(time).format("h:mm a"));
  }, [sendMessage]);

  return (
    <div className="chat">
      <div className="chat-header clearfix">
        <div className="row">
          <div className="col-lg-6">
            <a
              href="javascript:void(0);"
              data-toggle="modal"
              data-target="#view_info"
            >
              {/* <img
                src={currentReceiverProfilePhoto}
                alt='avatar'
              /> */}
            </a>
            <div className="chat-about">
              <div className="mb">{currentReceiverName}</div>
              <small>
                {currentReceiverStatus !== "online" ? "Last seen: " : ""}
                {currentReceiverStatus}
              </small>
            </div>
          </div>
        </div>
      </div>
      <div className="chat-history">
        <ul className="m-b-0">
          {messages.map(({ key, text, createdAt, index }) => (
            <li
              key={index}
              class={`clearfix flex-column align-${
                key === 0 ? "end" : "start"
              }`}
            >
              {key === 0 ? (
                <>
                  <div class="message other-message float-right">{text}</div>
                  <div class="message-data align-self-end">
                    <div class="message-data-time">
                      {createdAt.toDate().toLocaleString()}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div class="message my-message float-right align-start">
                    {text}
                  </div>
                  <div class="message-data align-self-start">
                    <div class="message-data-time">
                      {createdAt.toDate().toLocaleString()}
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="chat-message clearfix">
        <div className="flex-row">
          <input
            value={currentMessage}
            type="text"
            className="form-control"
            placeholder="Enter text here..."
            onChange={onChangeHandler}
            onKeyDown={(e) => (e.key === "Enter" ? sendMessage(e) : "")}
          />
          <span className="input-group-text">
            <i className="fa fa-send" onClick={sendMessage}></i>
          </span>
        </div>
      </div>
    </div>
  );
};

const Chatbox = () => {
  // to display the details of currently opened chat (receiver) in header
  const [currentReceiverName, setCurrentReceiverName] = useState("");
  const [currentReceiverStatus, setCurrentReceiverStatus] = useState("");
  const [currentReceiverProfilePhoto, setCurrentReceiverProfilePhoto] =
    useState("");
  const [currentReceiverChatID, setCurrentReceiverChatID] = useState("");

  // to store the details of the email of the sender
  const [senderEmail, setSenderEmail] = useState("");

  // state to store the chatUsers
  const [chatUsers, setChatUsers] = useState([]);

  // change the state variables when profile of a user is clicked
  const profileButtonClick = (name, status, uid) => {
    console.log("Clicked on another user");
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
    // if senderEmail is not yet fetched then do not make API CALL
    if (senderEmail === "") return;

    // make a query to fetch all the users from the FireBase Backend
    const getAllChatUsersFromFireBase = async () => {
      const chatUsersSnapshot = await getDocs(collection(db, "Account"));

      // iterate all the docs and just return the document data
      const chatUsersFromFireBase = chatUsersSnapshot.docs.map((doc) => {
        // get the data of the chatUser
        const chatUserData = doc.data();

        // if the status is string then set the value to online
        if (typeof chatUserData.status === "string") {
          chatUserData.status = "online";
        }
        // if the status is timestamp type then get the DateObject
        // indicates the user is offline currently and we will display the last seen
        else {
          chatUserData.status = chatUserData.status.toDate().toLocaleString();
        }

        // return the chatUserData object
        return chatUserData;
      });

      // keep all the chat users except the loggedInUser
      const chatUsersFromFireBaseWithoutLoggedInUser =
        chatUsersFromFireBase.filter(
          (element) => element.email !== senderEmail
        );

      //  update the state of chatUsers
      setChatUsers(chatUsersFromFireBaseWithoutLoggedInUser);
    };

    // fetch all the chatUsers from the FireBase
    getAllChatUsersFromFireBase();
  }, [senderEmail]);

  return (
    <div className="container-chat-box">
      <div className="row clearfix">
        <div className="col-lg-12" style={{ height: "75vh" }}>
          <div className="cardd chat-app">
            <div className="all-people">
              <div id="plist" className="people-list">
                <ul className="list-unstyled chat-list mt-2 mb-0">
                  {chatUsers.map(({ name, status, email }) => (
                    <li
                      className="clearfix"
                      onClick={() => profileButtonClick(name, status, email)}
                    >
                      {/* <img src={pic} alt='avatar' /> */}
                      <div className="about">
                        <span>
                          <i
                            className="fa fa-user icon"
                            style={{
                              color: `#${Math.floor(Math.random() * 1000000)}`,
                            }}
                          ></i>
                        </span>
                        <span className="name">{name}</span>
                        <div className="status">
                          {" "}
                          <i
                            className={`fa fa-circle
                            ${status !== "online" ? "offline" : "online"}`}
                          ></i>{" "}
                          {status}{" "}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
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