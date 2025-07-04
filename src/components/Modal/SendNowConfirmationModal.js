import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const SendNowConfirmationModal = ({ show, handleClose }) => {
  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Message Status</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>✅ All messages sent successfully!</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleClose}>
          Ok
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SendNowConfirmationModal;
