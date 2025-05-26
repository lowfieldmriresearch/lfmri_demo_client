import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import './index.css';

function App() {
  const [percentiles, setPercentiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5001/api/process-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log(data)
      setPercentiles(data.percentiles);
    } catch (err) {
      setError('Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const renderPlots = () => {
    return Object.keys(percentiles).map((region, index) => (
      <div key={index} className="p-4 bg-white rounded-lg shadow-lg my-4">
        <Plot
          data={[{
            x: Array.from({ length: 10 }, (_, i) => i * 10),
            y: percentiles[region],
            type: 'scatter',
            mode: 'lines+markers',
            marker: { color: 'blue' },
            name: region,
          }]}
          layout={{
            title: `${region} Percentiles`,
            xaxis: { title: 'Percentile' },
            yaxis: { title: 'Value' },
            hovermode: 'closest',
          }}
          onClick={(data) => {
            const clickedRegion = data.points[0].data.name;
            console.log('Clicked region:', clickedRegion);
          }}
        />
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-6">🧠 Brain Region Percentiles</h1>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-800 mb-6"
        />

        {loading && <p className="text-center text-gray-500">Loading...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {renderPlots()}
      </div>
    </div>
  );
}

export default App;