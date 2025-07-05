import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Modal } from 'react-bootstrap';
import { BsFillSendFill } from 'react-icons/bs';
import { SlCalender } from "react-icons/sl";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast, ToastContainer } from 'react-toastify';
import WhatsaapNumber from '../../container/whatsaapNumber/WhatsaapNumber';
import MessageInput from '../../container/MessageInput/MessageInput';
import FileAttachment from '../../container/FileAttachment/FileAttachment';
import ReceivedMessages from '../../container/ReceivedMessages/ReceivedMessages';
import SendNowModal from "../../components/Modal/SendNowModal";
import Header from "../../components/layout/Header";
import { useSelector, useDispatch } from 'react-redux';
import { storeMessage, storeScheduleMessage } from '../../redux/MessageSlice';
import { storeFiles } from '../../redux/FileAttachSlice';
import { storeWhatsappNumber } from '../../redux/whatsappSlice';
import MyLoader from '../Loding/MyLoader';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ScheduleSend from './ScheduleSend';
import SendNowConfirmationModal from '../Modal/SendNowConfirmationModal';
const Dashboard = () => {
  const session = useSelector(state => state.auth.sessions);
  const dispatch = useDispatch()

  const scheduledMessages = useSelector(state => state.message.ScheduleMessage);

  const navigate = useNavigate();
  const attachfiles = useSelector(state => state.fileAttach.FileAttach);

  const messages = useSelector(state => state.message.Message);
  const numbers = useSelector(state => state.whatsapp.whatsappNumber);

  const token = useSelector(state => state.auth.token);

  const [showCalendar, setShowCalendar] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showAllSendModal, setShowAllSendModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [triggerShowSendModal, setTriggerShowSendModal] = useState(false);

  const [sentMessages, setSentMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showAllSendModal && triggerShowSendModal) {
      setShowSendModal(true);          // Open Send Modal only when AllSendModal is closed
      setTriggerShowSendModal(false);  // Reset trigger
    }
  }, [showAllSendModal, triggerShowSendModal]);

  const preparePayload = () => {
    const to = numbers.map(n => {
      let num = n.number.toString().replace(/\D/g, '');
      if (num.startsWith('91') && num.length === 12) num = num.slice(2);
      else if (num.startsWith('0') && num.length === 11) num = num.slice(1);
      return `91${num}`;
    });

    const message = messages.map(m => m.text);
    const photo = attachfiles.filter(f => f.type === "Photos").map(f => f.url.split('/').pop());
    const videoFile = attachfiles.find(f => f.type === "Videos");
    const pdfFile = attachfiles.find(f => f.type === "Pdf");
    const docxFile = attachfiles.find(f => f.type === "Docx");


    if (to.length === 0 && message.length === 0) {
      toast.error("Please add at least one number or message.");
      return null;
    }

    return {
      from: session.map(s => s.realNumber),
      to,
      message,
      photo,
      video: videoFile ? videoFile.url.split('/').pop() : "",
      sendVideoAsSticker: true,
      pdf: pdfFile ? pdfFile.url.split('/').pop() : "",
      docx: docxFile ? docxFile.url.split('/').pop() : ""
    };
  };
  const sendWithRetry = async (payload, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post("http://localhost:4004/whatsapp/send", payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        return response.data;  // Return actual API data here
      } catch (err) {
        if (attempt === retries) throw err; // Last try failed, throw error
        await new Promise(res => setTimeout(res, 1000)); // Wait before retrying
      }
    }
  };

  const handleSendNow = async () => {
    const payload = preparePayload();
    if (!payload) return;

    const allSentMessages = [];
    const failedContacts = [];

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);

    setShowAllSendModal(true); // Show confirmation first

    try {
      try {
        const apiResponse = await sendWithRetry(payload);

        console.log("API Response:", apiResponse);

        if (apiResponse && apiResponse.status === "sent") {
          const formattedMessages = apiResponse.results.map((msg) => ({
            id: msg.to,
            type: msg.type,
            date: new Date().toISOString(),
            status: msg.status,
            message: msg.message,
          }));

          setSentMessages(formattedMessages);

          dispatch(storeMessage([]));
          dispatch(storeFiles([]));
          dispatch(storeWhatsappNumber([]));

          // 👇 Instead of directly calling setShowSendModal(true)
          setTriggerShowSendModal(true); // trigger to open it after modal closes

        }
      } catch (err) {
        toast.error("Failed to send messages after retries.");
        failedContacts.push(...payload.to);

        setShowAllSendModal(false);  // close confirmation modal
        setTriggerShowSendModal(false);
        setShowSendModal(false);
      }

      if (failedContacts.length === 0) {
        toast.success("✅ All messages sent successfully!");
      } else {
        toast.warn(`⚠️ Some contacts failed: ${failedContacts.length}`);
      }

    } finally {

      dispatch(storeMessage([]));
      dispatch(storeFiles([]));
      dispatch(storeWhatsappNumber([]));
    }
  };


  // const preparePayload = () => {
  //   const to = numbers.map(n => {
  //     let num = n.number.toString().replace(/\D/g, '');
  //     if (num.startsWith('91') && num.length === 12) num = num.slice(2);
  //     else if (num.startsWith('0') && num.length === 11) num = num.slice(1);
  //     return `91${num}`;
  //   });

  //   const message = messages.map(m => m.text);
  //   const photo = attachfiles.filter(f => f.type === "Photos").map(f => f.url.split('/').pop());
  //   const videoFile = attachfiles.find(f => f.type === "Videos");
  //   const pdfFile = attachfiles.find(f => f.type === "Pdf");
  //   const docxFile = attachfiles.find(f => f.type === "Docx");

  //   if (to.length === 0 && message.length === 0) {
  //     toast.error("Please add at least one number or message.");
  //     return null;
  //   }

  //   return {
  //     from: session.map(s => s.realNumber),
  //     to,
  //     message,
  //     photo,
  //     video: videoFile ? videoFile.url.split('/').pop() : "",
  //     sendVideoAsSticker: true,
  //     pdf: pdfFile ? pdfFile.url.split('/').pop() : "",
  //     docx: docxFile ? docxFile.url.split('/').pop() : ""
  //   };
  // };
  // const sendMessages = async (payload) => {
  //   try {
  //     await axios.post("http://localhost:4004/whatsapp/send", payload, {
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });
  //     return true; // Success
  //   } catch (err) {
  //     throw err; // Error if it fails
  //   }
  // };

  // const handleSendNow = async () => {
  //   const payload = preparePayload();
  //   if (!payload) return;

  //   setLoading(true);
  //   setShowSendModal(true); // Show modal immediately

  //   // Stop loading quickly, don't wait for API
  //   setTimeout(() => {
  //     setLoading(false);
  //   }, 3000); // Stop loading in 3 seconds

  //   // Close modal in 2 minutes
  //   setTimeout(() => {
  //     setShowSendModal(false);
  //   }, 120000);

  //   try {
  //     // API call runs in the background
  //     const success = await sendMessages(payload);

  //     if (success) {
  //       const formattedMessages = payload.to.map(number => ({
  //         id: number,
  //         type: "Contact",
  //         date: new Date().toISOString(),
  //         status: "Sent",
  //         message: payload.message[0] || '',
  //       }));

  //       setSentMessages(formattedMessages);
  //       dispatch(storeMessage([]));
  //       dispatch(storeFiles([]));
  //       dispatch(storeWhatsappNumber([]));

  //       toast.success("✅ All messages sent successfully!");
  //     }
  //   } catch (err) {
  //     toast.error("⚠️ Failed to send messages.");
  //   }
  // };



  const handleScheduleSend = async () => {
    const payload = preparePayload();
    if (!payload) return;

    payload.scheduledTime = new Date(scheduledDate).toISOString();
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:4004/whatsapp/sendsc", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }
      });

      dispatch(storeMessage([]));
      dispatch(storeFiles([]));
      dispatch(storeWhatsappNumber([]));
      const updatedMessages = [...scheduledMessages, res.data];
      dispatch(storeScheduleMessage(updatedMessages));
      toast.success("Message scheduled successfully!");
    } catch (error) {
      console.error("Error scheduling message:", error);
      toast.error(error?.response?.data?.message || 'Failed to schedule message.');
    } finally {
      setLoading(false);
    }
  };
  const sentmessge = () => navigate('/sent');


  return (
    <>
      {loading ? <MyLoader /> : <>
        <Header />
        <Container fluid className="bg-light" style={{ height: '92vh' }}>
          <Row className="h-100">
            <Col md={4} className="text-white p-3 bg-white">
              <ReceivedMessages />
              {scheduledMessages.length !== 0 && <ScheduleSend />}
            </Col>

            <Col md={4} className="text-white p-3 bg-white">
              <WhatsaapNumber />
            </Col>

            <Col md={4} className="bg-white d-flex flex-column">
              <div className="p-3">
                <MessageInput />
                <FileAttachment />
              </div>

              <div
                className="d-flex justify-content-between align-items-center px-4 py-2 text-white bg-success"
                style={{
                  position: 'fixed',
                  bottom: 0,
                  width: '30vw',
                  fontWeight: '500',
                  boxShadow: '0 -2px 6px rgba(0, 0, 0, 0.15)',
                }}
              >
                <button
                  onClick={() => setShowCalendar(true)}
                  className="btn border-0 d-flex align-items-center gap-2 px-2 py-1 rounded-pill"
                  style={{
                    backgroundColor: '#25D366',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: "12px",
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <SlCalender size={20} />
                  Schedule Send
                </button>



                <button
                  onClick={handleSendNow}
                  className="btn border-0 d-flex align-items-center gap-2 px-2 py-1 rounded-pill"
                  style={{
                    backgroundColor: '#128C7E',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: "12px",
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  }}
                  disabled={loading}
                >
                  <BsFillSendFill size={18} />
                  {loading ? "Sending..." : "Send Now"}
                </button>
              </div>
            </Col>
          </Row>

          {/* Send Now Modal */}
          {showSendModal && (
            <SendNowModal
              show={showSendModal}
              handleClose={() => setShowSendModal(false)}
              sentMessages={sentMessages}
            />
          )}
          {
            showAllSendModal && (
              <SendNowConfirmationModal

                show={showAllSendModal}
                handleClose={() => setShowAllSendModal(false)}
              />
            )
          }

          {/* Schedule Modal */}
          <Modal show={showCalendar} onHide={() => setShowCalendar(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Select Schedule Date & Time</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <DatePicker
                selected={scheduledDate}
                onChange={(date) => setScheduledDate(date)}
                showTimeSelect
                timeIntervals={1}
                timeFormat="HH:mm"
                dateFormat="MMMM d, yyyy h:mm aa"
                className="form-control"
              />

            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowCalendar(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleScheduleSend} // 🔁 Call API here
              >
                Confirm Schedule
              </Button>

            </Modal.Footer>
          </Modal>

        </Container>
      </>}

    </>
  );
};

export default Dashboard;
