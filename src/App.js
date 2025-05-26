import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import './index.css'; // Assuming Tailwind CSS is configured
import { useWindowSize } from 'react-use';
import myCustomColorscale from './cmap_nautre_bluered.txt';

function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [percentiles, setPercentiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null); // Track selected region for detailed view
  const [detailedRegionData, setDetailedRegionData] = useState(null); // Store the detailed data for the selected region
  const [selectedOption, setSelectedOption] = useState('PT'); // Track PT/FT toggle state
  const { width } = useWindowSize();

  useEffect(() => {
    // Automatically select the first region when percentiles data is loaded
    if (Object.keys(percentiles).length > 0 && !selectedRegion) {
      const firstRegion = Object.keys(percentiles)[0];
      setSelectedRegion(firstRegion); // Set the first region as default
    }
  }, [percentiles, selectedRegion]);

  useEffect(() => {
    if (uploadedFile) {
      fetchPercentiles(uploadedFile, selectedOption);
    }
  }, [selectedOption]);
  

  useEffect(() => {
    if (selectedRegion && selectedOption) {
      const fetchRegionData = async () => {
        try {
          setLoading(true);
          setError(null);

          // Fetch detailed region data from the backend, and the option of PT/FT
          const response = await fetch(`https://lfmri-demo-server.onrender.com/api/get-region-percentiles?region=${selectedRegion}&option=${selectedOption}`);
          const data = await response.json();
          setDetailedRegionData(data); // Set the detailed data for the selected region
        } catch (err) {
          setError('Failed to load detailed data');
        } finally {
          setLoading(false);
        }
      };

      fetchRegionData();
    }
  }, [selectedRegion,selectedOption]); // Run this effect whenever the selectedRegion or selectedOption changes


  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploadedFile(file); // Save for reuse
  
    await fetchPercentiles(file, selectedOption);
  };

  const fetchPercentiles = async (file, option) => {
    setLoading(true);
    setError(null);
  
    const formData = new FormData();
    formData.append('file', file);
    formData.append('option', option);  // Pass the selectedOption to backend
  
    try {
      const response = await fetch('https://lfmri-demo-server.onrender.com/api/process-csv', {
        method: 'POST',
        body: formData,
      });
  
      const data = await response.json();
      console.log('data from backend:', data.percentiles);
      setPercentiles(data.percentiles);
    } catch (err) {
      setError('Failed to process file');
    } finally {
      setLoading(false);
    }
  };
  

  

  const renderBarPlot = () => {
    const gradientImageUrl = '/colorbar.png'; // e.g., '/gradient.png' or 'data:image/png;base64,...'

    const barData = Object.keys(percentiles).map(region => {
      // Extract the individual percentiles for each region
      const regionPercentiles = percentiles[region][0]; // Assuming percentiles are stored in an array for each region

      return {
        region,
        pvalue: regionPercentiles.inputPercentile,
        
      };
    });
    
  
    return (
      <Plot
        data={[
          {
            x: barData.map(d => d.region),
            y: barData.map(d => d.pvalue),
            type: 'bar',
            name: 'Percentiles',
            marker: {
              color: barData.map(d => d.pvalue),  // Gradient based on value
              colorscale: myCustomColorscale,                // Try 'Viridis', 'YlGnBu', etc.
              cmin: -0.000001,                            // Adjust based on your percentile range
              cmax: 100,
              colorbar: {
                title: 'Percentile'
              }
            }
          }
        ]}
        layout={{
          width: width*0.75, 
          title: {
            text: 'Percentiles by Brain Region',
            font: {
              size: 24,       // Adjust font size
              color: 'black',
              family: 'Arial bold',
              // Note: Plotly doesn't support fontWeight directly,
              // but you can use a bold font family like 'Arial Black' or 'Helvetica Bold'
            }
          },
          xaxis: { tickangle: -45 },
          yaxis: { title: { text: 'Volumetric Percentile', font: { color: 'black' } },range: [0, 100]},
          barmode: 'group', // Group bars for each region
          bargap: 0.2, // Space between bars
          hovermode: 'closest',
        }}
        onClick={(data) => {
          const clickedRegion = data.points[0].x;
          setSelectedRegion(clickedRegion); // Set selected region for detailed view
        }}
      />
    );
  };
  
  
  const renderDetailedPlot = () => {
    if (!selectedRegion || !detailedRegionData) return null; // Don't render if no region is selected or no data available

    const selectedData = detailedRegionData;  // Use the fetched detailed data
    const selectedDataPrev = percentiles[selectedRegion];  // Use the percentiles data for the selected region

    //console.log("PervData is:", selectedDataPrev); 
    //console.log("Selected region:", selectedRegion); // Debug log to check selected region

    return (
      <div className="p-4 bg-white rounded-lg shadow-lg my-4">
        <Plot
          data={[
            {
              x: selectedData.ages,
              y: selectedData.p95,
              type: 'scatter',
              mode: 'lines',
              marker: { color: 'rgb(118,26,53)' },  // Deep Blue
              name: 'p95',
              line: {
                dash: 'longdash',
                width: 1.2,
              },
            },
            {
              x: selectedData.ages,
              y: selectedData.p75,
              type: 'scatter',
              mode: 'lines',
              marker: { color: 'rgb(179,129,143)' },  // Greenish Teal
              name: 'p75',
              line: {
                dash: 'longdash',
                width: 1.2,
              },
            },
            {
              x: selectedData.ages,
              y: selectedData.p50,
              type: 'scatter',
              mode: 'lines',
              marker: { color: 'rgb(180,180,180)' },  // Golden Yellow
              name: 'p50',
              line: {
                dash: 'longdash',
                width: 1.2,
              },
            },
            {
              x: selectedData.ages,
              y: selectedData.p25,
              type: 'scatter',
              mode: 'lines',
              marker: { color: 'rgb(131,152,176)' },  // Turquoise
              name: 'p25',
              line: {
                dash: 'longdash',
                width: 1.2,
              },
            },
            {
              x: selectedData.ages,
              y: selectedData.p5,
              type: 'scatter',
              mode: 'lines',
              marker: { color: 'rgb(30,69,113)' },  // Slate Blue
              name: 'p5',
              line: {
                dash: 'longdash',
                width: 1.2,
              },
            },
            // Additional single point
            {       
             x: [selectedDataPrev[0].curPMA],  // Single age value for the point (e.g., the first age)
             y: [selectedDataPrev[0].inputrawv],  // The y value for the point (e.g., a specific percentile or value)
             type: 'scatter',
             mode: 'markers',
             marker: { color: 'rgb(255, 0, 0)', size: 10 },  // Red color for the point
             name: 'Subject',
            },
          ]}
          layout={{
            width: width*0.75, 
            title: {
              text: selectedRegion,
              font: {
                size: 24,       // Adjust font size
                color: 'black',
                family: 'Arial bold',
                // Note: Plotly doesn't support fontWeight directly,
                // but you can use a bold font family like 'Arial Black' or 'Helvetica Bold'
              }
            },
            xaxis: { title: 'PMA (weeks)' },
            yaxis: { title: 'Volumetric Percentile' },
            hovermode: 'closest',
          }}
        />
      </div>
    );
  };

 // Handle the PT/FT toggle change
 const handleToggleChange = (event) => {
  setSelectedOption(event.target.value); // Set PT or FT based on toggle
};

return (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 px-4">
    <div className="w-full max-w-[2000px] bg-white rounded-lg shadow-lg p-8">
      <h1 className="text-3xl font-bold text-center mb-6">🧠 Brain Region Percentiles</h1>

      {/* PT/FT Toggle */}
      <div className="flex items-center mb-6">
        <label htmlFor="pt-ft-toggle" className="mr-4 text-lg">Select Option:</label>
        <select
          id="pt-ft-toggle"
          value={selectedOption}
          onChange={handleToggleChange}
          className="p-2 border rounded"
        >
          <option value="PT">Preterm (PT)</option>
          <option value="FT">Full-term (FT)</option>
        </select>
      </div>

      {/* File Upload */}
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-800 mb-6"
      />

      {/* Loading Indicator */}
      {loading && <p>Loading...</p>}

      {/* Error Message */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Display the Bar Plot (Average Percentiles) */}
      <div className="mb-12 w-[1400px] mx-auto">
        {Object.keys(percentiles).length > 0 && renderBarPlot()}
      </div>

      {/* Display Detailed Plot (Percentiles for Selected Region) */}
      <div className="mb-8 w-[1400px] mx-auto">
        {renderDetailedPlot()}
      </div>
    </div>
  </div>
);
}

export default App;