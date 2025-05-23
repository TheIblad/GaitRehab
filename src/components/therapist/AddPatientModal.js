import React, { useState } from 'react';
import Button from '../common/Button';
import { db, auth } from '../../firebase/config';
import { collection, doc, setDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import './AddPatientModal.css'; // Use the dedicated CSS file

function AddPatientModal({ isOpen, onClose, onPatientAdded, therapistId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patientData, setPatientData] = useState({
    displayName: '',
    email: '',
    password: '',
    phone: '',
    condition: '',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPatientData({
      ...patientData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create patient account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        patientData.email, 
        patientData.password
      );
      
      const user = userCredential.user;
      
      // Set patient's name
      await updateProfile(user, {
        displayName: patientData.displayName
      });
      
      // Save patient info
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: patientData.displayName,
        email: patientData.email,
        phone: patientData.phone || '',
        condition: patientData.condition || '',
        notes: patientData.notes || '',
        role: 'patient',
        assignedTherapistId: therapistId,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
      });
      
      // Add to therapist's patient list
      const therapistRef = doc(db, 'users', therapistId);
      await updateDoc(therapistRef, {
        patients: arrayUnion(user.uid)
      });
      
      if (onPatientAdded) {
        onPatientAdded();
      }
      
    } catch (error) {
      console.error('Error adding patient:', error);
      setError(error.message || 'Failed to add patient');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="add-patient-modal-overlay">
      <div className="add-patient-modal">
        <div className="add-patient-modal-header">
          <h3>Add New Patient</h3>
          <button className="add-patient-close-button" onClick={onClose}>×</button>
        </div>
        
        {error && (
          <div className="add-patient-error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="add-patient-form-group">
            <label htmlFor="displayName">Full Name</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={patientData.displayName}
              onChange={handleChange}
              required
              placeholder="Enter patient's full name"
            />
          </div>
          
          <div className="add-patient-form-row">
            <div className="add-patient-form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={patientData.email}
                onChange={handleChange}
                required
                placeholder="Enter patient's email"
              />
            </div>
            <div className="add-patient-form-group">
              <label htmlFor="password">Temporary Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={patientData.password}
                onChange={handleChange}
                required
                minLength="6"
                placeholder="Minimum 6 characters"
              />
            </div>
          </div>
          
          <div className="add-patient-form-group">
            <label htmlFor="phone">Phone Number (Optional)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={patientData.phone}
              onChange={handleChange}
              placeholder="Enter patient's phone number"
            />
          </div>
          
          <div className="add-patient-form-group">
            <label htmlFor="condition">Medical Condition</label>
            <input
              type="text"
              id="condition"
              name="condition"
              value={patientData.condition}
              onChange={handleChange}
              placeholder="E.g., Post-stroke rehabilitation"
            />
          </div>
          
          <div className="add-patient-form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              rows="3"
              value={patientData.notes}
              onChange={handleChange}
              placeholder="Add any relevant patient notes or instructions here"
            ></textarea>
          </div>
          
          <div className="add-patient-button-group">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="add-patient-cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="add-patient-submit-button"
            >
              {loading ? "Adding Patient..." : "Add Patient"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPatientModal;