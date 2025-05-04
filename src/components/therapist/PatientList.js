import React, { useState } from 'react';
import './PatientList.css';
import Button from '../common/Button';
import AddPatientModal from './AddPatientModal';
import { useAuth } from '../../contexts/AuthContext';

function PatientList({ patients = [], onMessage, onPatientAdded }) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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

  return (
    <div className="patient-list">
      <div className="patient-list-header">
        <h3>My Patients</h3>
        <Button variant="primary" onClick={handleOpenModal}>Add Patient</Button>
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
          </div>
        ) : (
          patients.map(patient => (
            <div key={patient.id} className="patient-row">
              <div className="patient-name">
                <span>{patient.displayName || patient.name}</span>
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
                <Button variant="secondary" onClick={() => window.location.href = `/patient-details?id=${patient.id}`}>
                  View
                </Button>
                <Button variant="ghost" onClick={() => onMessage(patient.id)}>
                  Message
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Modal for adding new patients */}
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