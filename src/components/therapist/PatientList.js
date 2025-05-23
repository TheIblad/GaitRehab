import React, { useState } from 'react';
import './PatientList.css';
import Button from '../common/Button';
import AddPatientModal from './AddPatientModal';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function PatientList({ patients = [], onPatientAdded }) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handlePatientAdded = () => {
    setIsModalOpen(false);
    if (onPatientAdded) {
      onPatientAdded();
    }
  };

  const handleMessagePatient = (patientId) => {
    navigate(`/messages?user=${patientId}`);
  };

  const handleViewPatient = (patientId) => {
    navigate(`/patient-details?id=${patientId}`);
  };

  // Get initials from patient's name
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="patient-list">
      <div className="patient-list-header">
        <h3>My Patients</h3>
        <Button 
          variant="primary" 
          onClick={handleOpenModal}
          className="add-patient-button"
        >
          Add Patient
        </Button>
      </div>
      <div className="patient-table">
        <div className="patient-table-header">
          <span>Name</span>
          <span>Progress</span>
          <span>Last Active</span>
          <span>Actions</span>
        </div>
        {patients.length === 0 ? (
          <div className="no-patients">
            <p>No patients found. Add your first patient to get started.</p>
            <Button 
              variant="primary" 
              onClick={handleOpenModal}
              className="add-patient-button"
            >
              Add Patient
            </Button>
          </div>
        ) : (
          patients.map(patient => (
            <div key={patient.id} className="patient-row">
              <div className="patient-name">
                <div className="patient-avatar">
                  {getInitials(patient.displayName || patient.name)}
                </div>
                <span>{patient.displayName || patient.name}</span>
                {patient.condition && (
                  <span className="status-badge">{patient.condition}</span>
                )}
              </div>
              <div className="patient-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${patient.progressPercent || 0}%` }}
                  ></div>
                </div>
                <span>{patient.progress || '-'}</span>
              </div>
              <div className="patient-last-active">
                {patient.lastActive || 'N/A'}
              </div>
              <div className="patient-actions">
                <Button 
                  variant="secondary" 
                  className="view-patient-button"
                  onClick={() => handleViewPatient(patient.id)}
                >
                  View
                </Button>
                <Button 
                  variant="ghost" 
                  className="message-patient-button"
                  onClick={() => handleMessagePatient(patient.id)}
                >
                  Message
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <AddPatientModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onPatientAdded={handlePatientAdded}
        therapistId={user?.uid}
      />
    </div>
  );
}

export default PatientList;