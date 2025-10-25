import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";

const VideoCall = ({ socket, myId }) => {
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callersInRoom, setCallersInRoom] = useState([]); // Track connected users

  const myVideo = useRef();
  const userVideos = useRef({}); // Store multiple users' videos
  const peersRef = useRef({});

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;
    });

    socket.on("user_connected", ({ users }) => {
      setCallersInRoom(users);
    });

    socket.on("incoming_call", ({ from, signal }) => {
      setReceivingCall(true);
      setCaller(from);
      setCallerSignal(signal);
    });

    socket.on("call_accepted", ({ signal, from }) => {
      peersRef.current[from].signal(signal);
    });

    socket.on("user_disconnected", (userId) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].destroy();
        delete peersRef.current[userId];
      }
      setCallersInRoom((prevUsers) => prevUsers.filter((id) => id !== userId));
    });

    return () => {
      socket.off("user_connected");
      socket.off("incoming_call");
      socket.off("call_accepted");
      socket.off("user_disconnected");
    };
  }, [socket]);

  const callUser = (userId) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on("signal", (signal) => {
      socket.emit("call_user", { userToCall: userId, signalData: signal, from: myId });
    });

    peer.on("stream", (remoteStream) => {
      if (userVideos.current[userId]) userVideos.current[userId].srcObject = remoteStream;
    });

    peersRef.current[userId] = peer;
  };

  const acceptCall = () => {
    setCallAccepted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on("signal", (signal) => {
      socket.emit("accept_call", { signal, to: caller });
    });

    peer.on("stream", (remoteStream) => {
      if (userVideos.current[caller]) userVideos.current[caller].srcObject = remoteStream;
    });

    peer.signal(callerSignal);
    peersRef.current[caller] = peer;
  };

  const endCall = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    Object.values(peersRef.current).forEach((peer) => peer.destroy());
    peersRef.current = {};

    socket.emit("end_call");
  };

  return (
    <div>
      <h2>Video Call</h2>
      <video ref={myVideo} autoPlay muted style={{ width: "300px" }} />
      {callAccepted &&
        callersInRoom.map((userId) => (
          <video
            key={userId}
            ref={(el) => (userVideos.current[userId] = el)}
            autoPlay
            style={{ width: "300px" }}
          />
        ))}
      <br />

      {receivingCall && !callAccepted && (
        <div>
          <h3>Incoming Call...</h3>
          <button onClick={acceptCall}>Accept</button>
        </div>
      )}

      {callAccepted && (
        <button onClick={endCall} style={{ background: "red", color: "white" }}>
          Disconnect
        </button>
      )}
    </div>
  );
};

export default VideoCall;
