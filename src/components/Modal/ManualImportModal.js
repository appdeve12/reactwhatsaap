import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useSelector } from 'react-redux';

const ManualImportModal = ({ show, handleClose, handleImport, initialData = []  }) => {
  const session = useSelector(state => state.auth.sessions);
  const [campaignName, setCampaignName] = useState('');
  const [numbersText, setNumbersText] = useState('');
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(null);
  const [verifiedCount, setVerifiedCount] = useState(0);
const sanitizeNumbers = (rawNumbers) => {
  return rawNumbers
    .split(/[\n,]+/)
    .map(num => num.replace(/\D/g, '')) // remove non-digits
    .map(num => {
      if (num.length === 10) {
        return '91' + num; // append country code if only 10 digits
      } else if (num.length === 12 && num.startsWith('91')) {
        return num; // already has country code
      } else {
        return null; // invalid
      }
    })
    .filter(Boolean); // remove nulls
};


  const getNumbersArray = () => {
    return sanitizeNumbers(numbersText);
  };

  useEffect(() => {
    const numbers = getNumbersArray();
    setTotalCount(numbers.length);
  }, [numbersText]);

  const removeDuplicates = () => {
    const originalNumbers = getNumbersArray();
    const uniqueNumbers = [...new Set(originalNumbers)];
    setNumbersText(uniqueNumbers.join('\n'));
    const removedCount = originalNumbers.length - uniqueNumbers.length;
    setDuplicatesRemoved(removedCount);
    setVerifiedCount(0); // reset verified count after change
  };

  const sanitizeAndSetText = (inputText) => {
    const cleaned = sanitizeNumbers(inputText).join('\n');
    setNumbersText(cleaned);
  };

  const verificationnumber = async () => {
    const allNumbers = getNumbersArray();
    const batchSize = 100;
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const verifiedNumbers = [];

    const sessionNumber = session[0]?.realNumber;
    if (!sessionNumber) return;

    setLoadingVerify(true);

    for (let i = 0; i < allNumbers.length; i += batchSize) {
      const batch = allNumbers.slice(i, i + batchSize);

      try {
        const response = await axios.post('http://13.49.243.216/check', {
          sessionNumber: sessionNumber,
          numbers: batch,
        });

        if (response.data?.results && Array.isArray(response.data.results)) {
          const registered = response.data.results
            .filter(r => r.isRegistered)
            .map(r => r.number);
          verifiedNumbers.push(...registered);
        }
      } catch (error) {
        console.error(`Error verifying batch ${i / batchSize + 1}:`, error);
      }

      await delay(1000);
    }

    setNumbersText(verifiedNumbers.join('\n'));
    setVerifiedCount(verifiedNumbers.length);
    setLoadingVerify(false);
  };

  const processContacts = () => {
    const contacts = getNumbersArray().map(number => ({
      name: campaignName,
      number,
    }));
    handleImport(contacts);
  };
  const handleTextChange = (e) => {
    const inputText = e.target.value;
  
    // Check if user is pasting (via Ctrl+V or right-click)
    if (e.nativeEvent.inputType === 'insertFromPaste') {
      const cleaned = sanitizeNumbers(inputText).join('\n');
      setNumbersText(cleaned);
    } else {
      setNumbersText(inputText); // Allow normal typing
    }
  
    setVerifiedCount(0);
    setDuplicatesRemoved(null);
  };
  useEffect(() => {
  if (initialData.length > 0) {
    setCampaignName(initialData[0]?.name || '');
    const initialNumbers = initialData.map(item => item.number).join('\n');
    setNumbersText(initialNumbers);
  }
}, [initialData]);

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Manual Import</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Campaign Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter campaign name"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
          />
        </Form.Group>

        <Form.Group>
          <Form.Label>Enter Mobile Numbers</Form.Label>
         
          <Form.Control
  as="textarea"
  rows={5}
  placeholder="Enter or paste numbers"
  value={numbersText}
  onChange={handleTextChange}
/>

        </Form.Group>

        <Row className="mt-3">
          <Col>
            <Button variant="dark" onClick={() => sanitizeAndSetText(numbersText)}>
              Sanitize Numbers
            </Button>{' '}
            <Button variant="warning" onClick={removeDuplicates}>
              Remove Duplicates
            </Button>
          </Col>
          <Col>
            <Button
              variant="info"
              onClick={verificationnumber}
              disabled={loadingVerify}
            >
              {loadingVerify ? (
                <>
                  <Spinner animation="border" size="sm" /> Verifying...
                </>
              ) : (
                'Number Verification'
              )}
            </Button>
          </Col>
        </Row>

        <Row className="mt-3">
          <Col>
            <Alert variant="secondary">
              <strong>Total:</strong> {totalCount} numbers
            </Alert>
            {duplicatesRemoved !== null && (
              <Alert variant="warning">
                <strong>Duplicates Removed:</strong> {duplicatesRemoved}
              </Alert>
            )}
            {verifiedCount > 0 && (
              <Alert variant="success">
                <strong>Verified WhatsApp Numbers:</strong> {verifiedCount}
              </Alert>
            )}
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={processContacts}
       
        >
          Import
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ManualImportModal;
