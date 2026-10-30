import React, { useEffect, useState } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import { useDispatch, useSelector } from 'react-redux';
import { findOtherUser, useLoggedInUser, useLoggedInUserId } from '../utils/utils';
import ProfileModal from './ProfileModal';
import UpdateGroupChatModal from './UpdateGroupChatModal';
import { MDBIcon } from 'mdb-react-ui-kit';
import { fetchMessages, sendMessage } from '../redux/actions/messagesActions';
import ScrollableChat from './ScrollableChat';
import io from "socket.io-client";
import { NEW_MESSAGE_RECEIVED } from '../redux/actions/types';
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";
import { addNotification } from '../redux/actions/notificationsActions';

const defaultOptions = {
  loop: true,
  autoplay: true,
  animationData: animationData,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};

const ENDPOINT = "http://localhost:5000";
export var socket, selectedChatCompare;

const MyConvo = ({ fetchAgain, setFetchAgain }) => {
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const selectedChat = useSelector((state) => state.chatsReducer.selectedChat);
  const loggedInUserId = useLoggedInUserId();
  const otherUser = findOtherUser(selectedChat, loggedInUserId);
  const loggedInUser = useLoggedInUser();

  const { messages, loadingSendMessage, errorSendMessage, loadingFetchMessages } = useSelector(state => state.messagesReducer);
  const { notifications } = useSelector(state => state.notificationsReducer);
  const dispatch = useDispatch();

  const renderChatName = () => {
    if (!selectedChat) {
      return "Select a chat";
    }
    return selectedChat.isGroupChat ? selectedChat.chatName : otherUser?.name || "Unknown";
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    dispatch(sendMessage(newMessage, selectedChat));
    setNewMessage("");
  };

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", loggedInUser);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
  }, []);

  useEffect(() => {
    if (selectedChat) {
      dispatch(fetchMessages(selectedChat));
      socket.emit('join chat', selectedChat._id);
    }
    selectedChatCompare = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    socket.on("message received", (newMessageReceived) => {
      if (!selectedChatCompare || selectedChatCompare._id !== newMessageReceived.chat._id) {
        if (!notifications.includes(newMessageReceived)) {
          dispatch(addNotification(newMessageReceived));
          setFetchAgain(!fetchAgain);
        }
      } else {
        dispatch({
          type: NEW_MESSAGE_RECEIVED,
          payload: newMessageReceived,
        });
      }
    });

    return () => {
      socket.off("message received");
    };
  });

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  return (
    <>
      <div className="chat-header d-flex justify-content-between align-items-center p-3">
        <h2>{renderChatName()}</h2>
        <div className="d-flex align-items-center">
          {selectedChat ? (
            !selectedChat.isGroupChat ? (
              <ProfileModal user={otherUser} />
            ) : (
              <UpdateGroupChatModal fetchMessages={fetchMessages} fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
            )
          ) : null}
        </div>
      </div>
      <div
        style={{ position: "relative", height: "400px", overflowY: "scroll" }}
        className="pt-3 pe-3"
      >
        {loadingFetchMessages ? (
          <Spinner
            animation="border"
            role="status"
            style={{
              width: '3rem',
              height: '3rem',
              display: 'block',
              margin: 'auto',
            }}
          >
            <span className="sr-only">Loading...</span>
          </Spinner>
        ) : (
          <div>
            <ScrollableChat messages={messages} />
          </div>
        )}

        {/* Other chat messages here */}
      </div>
      <div className="d-flex align-items-center pe-3 pt-3 mt-2" style={{ position: "relative", bottom: 0 }}>
        {istyping ? (
          <div className="me-2">
            <Lottie
              options={defaultOptions}
              width={70}
              style={{ marginBottom: 15 }}
            />
          </div>
        ) : null}
        <img
          src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-chat/ava6-bg.webp"
          alt="avatar 3"
          style={{ width: "40px", height: "100%" }}
        />
        <input
          type="text"
          className="form-control form-control-lg"
          id="exampleFormControlInput2"
          placeholder="Type message"
          value={newMessage}
          onChange={typingHandler}
        />
        <a className="ms-1 text-muted" href="#!">
          <MDBIcon fas icon="paperclip" />
        </a>
        <a className="ms-3 text-muted" href="#!">
          <MDBIcon fas icon="smile" />
        </a>
        <a className="ms-3" href="#!">
          <MDBIcon fas icon="paper-plane" onClick={handleSendMessage} />
        </a>
      </div>
    </>
  );
};

export default MyConvo;
