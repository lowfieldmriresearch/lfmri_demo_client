import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import './index.css'; // Assuming Tailwind CSS is configured
import { useWindowSize } from 'react-use';
import thisCustomColorscale from './use_this_cmap.txt';

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
          // publish version,
          const response = await fetch(`https://lfmri-demo-server.onrender.com/api/get-region-percentiles?region=${selectedRegion}&option=${selectedOption}`);
          // local debug,
          //const response = await fetch(`http://localhost:5001/api/get-region-percentiles?region=${selectedRegion}&option=${selectedOption}`);
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
    const barData = Object.keys(percentiles).map(region => {
      const regionPercentiles = percentiles[region][0];
      return {
        region,
        pvalue: regionPercentiles.inputPercentile,
        shiftedValue: regionPercentiles.inputPercentile - 50, // Shift baseline to zero
      };
    });
  
    return (
      <Plot
        data={[
          {
            x: barData.map(d => d.region),
            y: barData.map(d => d.shiftedValue),
            type: 'bar',
            name: 'Percentiles',
            marker: {
              color: barData.map(d => d.pvalue),
              colorscale: [
                [0.000, 'rgb(103, 0, 30)'],
                [0.010, 'rgb(111, 14, 43)'],
                [0.020, 'rgb(120, 28, 55)'],
                [0.030, 'rgb(128, 43, 68)'],
                [0.040, 'rgb(137, 57, 80)'],
                [0.051, 'rgb(145, 71, 92)'],
                [0.061, 'rgb(154, 85, 105)'],
                [0.071, 'rgb(162, 99, 117)'],
                [0.081, 'rgb(171, 113, 130)'],
                [0.091, 'rgb(179, 128, 143)'],
                [0.101, 'rgb(130, 152, 176)'],
                // ... add the rest of your stops here ...
                [1.000, 'rgb(5, 48, 97)']
              ],
              cmin: 0,
              cmax: 100,
              colorbar: {
                title: 'Percentile',
                tickvals: [0, 10, 25,50, 75, 100],
              },
            },
            hovertemplate: '%{x}<br>Percentile: %{customdata}%', // Show original percentile
            customdata: barData.map(d => d.pvalue),
          },
        ]}
        layout={{
          width: width * 0.77,
          margin: {
            t: 60,  // top
            b: 120, // bottom — increase this if labels are long
            l: 90,
            r:150,
          },
          title: {
            text: 'Percentiles by Brain Region',
            font: {
              size: 24,
              color: 'black',
              family: 'Arial bold',
            },
          },
          xaxis: { tickangle: -45 },
          yaxis: {
            title: { text: 'Volumetric Percentile', font: { color: 'black' } },
            range: [-50, 50],  // Show 50% baseline in the middle
            zeroline: true,
            zerolinewidth: 2,
            zerolinecolor: 'black',
            tickvals: [-50, -25, 0, 25, 50],
            ticktext: ['0%', '25%', '50%', '75%', '100%'], // label ticks as original percentiles
          },
          bargap: 0.2,
          hovermode: 'closest',
        }}
        config={{
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['sendDataToCloud'], // optional
        }}
        style={{ position: 'relative', zIndex: 0 }}
        onClick={(data) => {
          const clickedRegion = data.points[0].x;
          setSelectedRegion(clickedRegion);
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
      <div className="p-4 bg-white my-4">
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
            margin: {
              t: 60,  // top
              b: 120, // bottom — increase this if labels are long
              l: 90,
              r:160,
            },
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
          config={{
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['sendDataToCloud'], // optional
          }}
          style={{ position: 'relative', zIndex: 0 }}
        />
      </div>
    );
  };

  // function to prepare computed results to download,
const downloadCSV = () => {
  if (!percentiles || Object.keys(percentiles).length === 0) return;

  // Prepare CSV header
  const header = ['Region', 'Percentile'];
  
  // Prepare rows
  const rows = Object.entries(percentiles).map(([region, data]) => {
    const regionPercentiles = data[0]; // your structure seems to have an array with one object
    return [
      region,
      regionPercentiles.inputPercentile ?? '',
       // note: use inputVolume as you named it
    ];
  });

  // Build CSV content
  const csvContent =
    [header, ...rows]
      .map(row => row.join(','))
      .join('\n');

  // Create a Blob and a temporary download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.-]/g, '_'); // Replace characters not safe in filenames
  const csvfilename = `percentiles_${selectedOption}_${timestamp}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', csvfilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
<div className="flex items-center mb-6 space-x-4">
  <span className="mr-4 text-lg">Select Option:</span>
  
  <button
    onClick={() => setSelectedOption('PT')}
    className={`px-4 py-2 rounded ${
      selectedOption === 'PT' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
    }`}
  >
    Preterm (PT)
  </button>

  <button
    onClick={() => setSelectedOption('FT')}
    className={`px-4 py-2 rounded ${
      selectedOption === 'FT' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
    }`}
  >
    Full-term (FT)
  </button>
</div>



<label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
  Upload CSV
  <input
    type="file"
    accept=".csv"
    onChange={handleFileUpload}
    className="hidden"
  />
</label>


<a
  href="/example_input_fullterm.csv"
  download
  className="inline-block ml-10 mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
>
  ⬇️ Download Example Input
</a>

      {/* Loading Indicator */}
      {loading && <p>Loading...</p>}

      {/* Error Message */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Display the Bar Plot (Average Percentiles) */}
      <div className="mb-12 w-[1400px] mx-auto">
        {Object.keys(percentiles).length > 0 && renderBarPlot()}
      </div>
      {/* Download Button (Only show if percentiles exist) */}
{Object.keys(percentiles).length > 0 && (
  <div className="mt-8  ml-10">
    <button
      onClick={downloadCSV}
      className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-blue-700"
    >
      ⬇️ Download Percentiles CSV
    </button>
  </div>
)}

      {/* Display Detailed Plot (Percentiles for Selected Region) */}
      <div className="mb-8 w-[1400px] mx-auto">
        {renderDetailedPlot()}
      </div>

      

    </div>
  </div>
);

}

export default App;