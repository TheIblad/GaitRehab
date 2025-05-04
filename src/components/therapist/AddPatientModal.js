import React, { useState } from 'react';
import Button from '../common/Button';
import { db, auth } from '../../firebase/config';
import { collection, doc, setDoc, serverTimestamp, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import '../patient/ActivityModal.css'; // Reuse the same modal styles

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
      // 1. Create a new user account for the patient
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        patientData.email, 
        patientData.password
      );
      
      const user = userCredential.user;
      
      // 2. Update the user's display name
      await updateProfile(user, {
        displayName: patientData.displayName
      });
      
      // 3. Store patient data in Firestore
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
      
      // 4. Also add this patient to the therapist's patients list
      const therapistRef = doc(db, 'users', therapistId);
      await updateDoc(therapistRef, {
        patients: [...(therapistRef.patients || []), user.uid]
      });
      
      // Success, call the callback
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
    <div className="modal-overlay">
      <div className="activity-modal">
        <div className="modal-header">
          <h3>Add New Patient</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {error && (
          <div className="error-message" style={{ margin: '1rem 1.5rem 0', padding: '0.5rem' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="displayName">Full Name</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={patientData.displayName}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={patientData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Temporary Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={patientData.password}
                onChange={handleChange}
                required
                minLength="6"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone Number (Optional)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={patientData.phone}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="condition">Medical Condition</label>
            <input
              type="text"
              id="condition"
              name="condition"
              value={patientData.condition}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              rows="3"
              value={patientData.notes}
              onChange={handleChange}
            ></textarea>
          </div>
          
          <div className="button-group">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? "Adding Patient..." : "Add Patient"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

async function updatePatients() {
  const therapistId = "qtzFaYlslPcOcQd5dvOXjkbN8J62"; // Replace with the correct therapist UID
  const patientsQuery = query(
    collection(db, "users"),
    where("role", "==", "patient"),
    where("assignedTherapistId", "==", null) // Find patients without assignedTherapistId
  );

  const querySnapshot = await getDocs(patientsQuery);

  querySnapshot.forEach(async (docSnapshot) => {
    const patientRef = doc(db, "users", docSnapshot.id);
    await updateDoc(patientRef, {
      assignedTherapistId: therapistId,
    });
    console.log(`Updated patient: ${docSnapshot.id}`);
  });
}

updatePatients();

export default AddPatientModal;