import React, { useState } from 'react';

function DataEntryForm() {
  const [data, setData] = useState({ steps: '', symmetry: '' });

  const handleChange = (e) =>
    setData({ ...data, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add data submission logic here (e.g., call useFirestore)
    console.log('Data submitted:', data);
    setData({ steps: '', symmetry: '' });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="steps">Steps</label>
      <input
        type="number"
        name="steps"
        id="steps"
        value={data.steps}
        onChange={handleChange}
        required
      />
      <label htmlFor="symmetry">Gait Symmetry (%)</label>
      <input
        type="number"
        name="symmetry"
        id="symmetry"
        value={data.symmetry}
        onChange={handleChange}
        required
      />
      <button type="submit">Submit</button>
    </form>
  );
}

export default DataEntryForm;