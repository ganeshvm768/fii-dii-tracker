import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Calendar, AlertCircle, Edit, Upload, Download } from 'lucide-react';

const FIIDIITracker = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);

  // Weightage configuration
  const WEIGHTAGE = {
    FII: 3.0,      // Highest weightage
    PRO: 2.0,      // Second highest
    RETAIL: 1.0,   // Normal weightage (Client)
    DII: 0.3       // Very low weightage
  };

  // Calculate activity based on change value
  const calculateActivity = (instrument, change) => {
    if (change === 0) {
      if (instrument === 'Future') return 'No Change';
      if (instrument === 'CE') return 'No Change';
      if (instrument === 'PE') return 'No Change';
    }
    
    if (instrument === 'Future') {
      return change > 0 ? 'Bought Futures' : 'Sold Futures';
    } else if (instrument === 'CE') {
      return change > 0 ? 'Bought Calls' : 'Sold Calls';
    } else if (instrument === 'PE') {
      return change > 0 ? 'Bought Puts' : 'Sold Puts';
    }
    return 'Unknown';
  };

  // Calculate trend based on instrument type and change
  const calculateTrend = (instrument, change, activity) => {
    if (change === 0) return 'Neutral';
    
    // Bearish indicators
    if (activity === 'Sold Futures' || activity === 'Sold Calls' || activity === 'Bought Puts') {
      return 'Bearish';
    }
    // Bullish indicators
    if (activity === 'Bought Futures' || activity === 'Bought Calls' || activity === 'Sold Puts') {
      return 'Bullish';
    }
    return 'Neutral';
  };

  // Calculate overall market trend with weightages
  const calculateOverallTrend = (categories) => {
    let bearishScore = 0;
    let bullishScore = 0;

    categories.forEach(cat => {
      const weightage = WEIGHTAGE[cat.name] || 1.0;
      
      cat.instruments.forEach(inst => {
        const absChange = Math.abs(inst.change);
        
        // Skip DII if it's neutral (as per requirement)
        if (cat.name === 'DII' && inst.trend === 'Neutral') {
          return;
        }
        
        // Apply weightage to the change value
        const weightedChange = absChange * weightage;
        
        if (inst.trend === 'Bearish') {
          bearishScore += weightedChange;
        } else if (inst.trend === 'Bullish') {
          bullishScore += weightedChange;
        }
      });
    });

    // Calculate total and percentages
    const total = bearishScore + bullishScore;
    if (total === 0) return 'NEUTRAL';
    
    const bearishPercent = (bearishScore / total) * 100;
    const bullishPercent = (bullishScore / total) * 100;
    
    // If difference is less than 5%, consider it neutral
    if (Math.abs(bearishPercent - bullishPercent) < 5) {
      return 'NEUTRAL';
    }
    
    return bearishScore > bullishScore ? 'BEARISH' : 'BULLISH';
  };

  // Process raw data and calculate trends
  const processData = (rawData) => {
    const processedCategories = rawData.categories.map(category => ({
      name: category.name,
      instruments: category.instruments.map(inst => {
        const activity = calculateActivity(inst.type, inst.change);
        const trend = calculateTrend(inst.type, inst.change, activity);
        return {
          ...inst,
          activity,
          trend
        };
      })
    }));

    const overallTrend = calculateOverallTrend(processedCategories);

    return {
      date: rawData.date,
      categories: processedCategories,
      overallTrend
    };
  };

  // Fetch data from JSON file or localStorage
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to fetch from data.json file
      try {
        const response = await fetch('/data.json');
        if (response.ok) {
          const rawData = await response.json();
          const processed = processData(rawData);
          setData(processed);
          setLastUpdated(new Date().toLocaleString());
          return;
        }
      } catch (e) {
        console.log('No data.json found, using localStorage or default');
      }

      // Fallback to localStorage
      const stored = localStorage.getItem('fii-dii-data');
      if (stored) {
        const rawData = JSON.parse(stored);
        const processed = processData(rawData);
        setData(processed);
        setLastUpdated(new Date().toLocaleString());
      } else {
        // Default sample data
        const defaultData = {
          date: new Date().toLocaleDateString('en-GB'),
          categories: [
            {
              name: 'FII',
              instruments: [
                { type: 'Future', change: -8384 },
                { type: 'CE', change: -14952 },
                { type: 'PE', change: 4664 }
              ]
            },
            {
              name: 'PRO',
              instruments: [
                { type: 'Future', change: 4380 },
                { type: 'CE', change: -37748 },
                { type: 'PE', change: 67757 }
              ]
            },
            {
              name: 'DII',
              instruments: [
                { type: 'Future', change: 366 },
                { type: 'CE', change: 0 },
                { type: 'PE', change: 0 }
              ]
            },
            {
              name: 'RETAIL',
              instruments: [
                { type: 'Future', change: 3638 },
                { type: 'CE', change: 52701 },
                { type: 'PE', change: -72421 }
              ]
            }
          ]
        };
        
        const processed = processData(defaultData);
        setData(processed);
        setLastUpdated(new Date().toLocaleString());
        
        // Save to localStorage
        localStorage.setItem('fii-dii-data', JSON.stringify(defaultData));
      }
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getTrendColor = (trend) => {
    if (trend === 'Bearish') return 'bg-red-600';
    if (trend === 'Bullish') return 'bg-green-600';
    return 'bg-gray-600';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'Bearish') return <TrendingDown className="w-4 h-4" />;
    if (trend === 'Bullish') return <TrendingUp className="w-4 h-4" />;
    return <span className="w-4 h-4">━</span>;
  };

  const formatChange = (change) => {
    return change > 0 ? `+${change.toLocaleString()}` : change.toLocaleString();
  };

  // Edit mode functions
  const startEdit = () => {
    if (!data) return;
    
    // Create raw data structure for editing
    const rawData = {
      date: data.date,
      categories: data.categories.map(cat => ({
        name: cat.name,
        instruments: cat.instruments.map(inst => ({
          type: inst.type,
          change: inst.change
        }))
      }))
    };
    
    setEditData(rawData);
    setEditMode(true);
  };

  const handleEditChange = (categoryIndex, instrumentIndex, value) => {
    const newEditData = { ...editData };
    newEditData.categories[categoryIndex].instruments[instrumentIndex].change = parseInt(value) || 0;
    setEditData(newEditData);
  };

  const saveEdit = () => {
    // Save to localStorage
    localStorage.setItem('fii-dii-data', JSON.stringify(editData));
    
    // Process and update display
    const processed = processData(editData);
    setData(processed);
    setLastUpdated(new Date().toLocaleString());
    setEditMode(false);
    setEditData(null);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditData(null);
  };

  const downloadJSON = () => {
    if (!data) return;
    
    const rawData = {
      date: data.date,
      categories: data.categories.map(cat => ({
        name: cat.name,
        instruments: cat.instruments.map(inst => ({
          type: inst.type,
          change: inst.change
        }))
      }))
    };
    
    const blob = new Blob([JSON.stringify(rawData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fii-dii-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // Upload JSON file
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawData = JSON.parse(e.target.result);
        
        // Validate JSON structure
        if (!rawData.date || !rawData.categories) {
          setError('Invalid JSON format. Please check your file.');
          return;
        }

        // Save to localStorage
        localStorage.setItem('fii-dii-data', JSON.stringify(rawData));
        
        // Process and display
        const processed = processData(rawData);
        setData(processed);
        setLastUpdated(new Date().toLocaleString());
        setError(null);
        
        // Clear error if any
        setTimeout(() => {
          alert('✅ Data uploaded successfully!');
        }, 100);
      } catch (err) {
        setError('Failed to parse JSON file. Please check the format.');
        console.error('JSON parse error:', err);
      }
    };
    
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  const triggerFileUpload = () => {
    document.getElementById('json-upload').click();
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-3">
          <RefreshCw className="animate-spin" />
          Loading FII/DII Data...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <h1 className="text-3xl md:text-4xl font-bold">
                {data?.date} - FII DII FNO ACTIVITY
              </h1>
              <div className="flex flex-wrap gap-2">
                <input
                  type="file"
                  id="json-upload"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={triggerFileUpload}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg transition-colors"
                  title="Upload JSON file to update data"
                >
                  <Upload className="w-5 h-5" />
                  Upload JSON
                </button>
                <button
                  onClick={downloadJSON}
                  className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg transition-colors"
                  title="Download current data as JSON"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
                <button
                  onClick={startEdit}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-lg transition-colors"
                >
                  <Edit className="w-5 h-5" />
                  Edit Data
                </button>
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-4 py-3 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
            
            {lastUpdated && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar className="w-4 h-4" />
                Last Updated: {lastUpdated}
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-900/50 border border-red-600 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-200">{error}</span>
              </div>
            )}
          </div>

          {/* Edit Mode */}
          {editMode && editData && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Edit Daily Data</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Date (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    value={editData.date}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    className="w-full bg-gray-700 px-4 py-2 rounded"
                    placeholder="08/01/2026"
                  />
                </div>

                {editData.categories.map((category, catIndex) => (
                  <div key={category.name} className="mb-6 border border-gray-700 rounded-lg p-4">
                    <h3 className="text-xl font-bold mb-3">
                      {category.name}
                      <span className="text-sm font-normal text-gray-400 ml-2">
                        (Weightage: {WEIGHTAGE[category.name]}x)
                      </span>
                    </h3>
                    <div className="space-y-3">
                      {category.instruments.map((instrument, instIndex) => (
                        <div key={instrument.type} className="flex items-center gap-4">
                          <label className="w-24 font-semibold">{instrument.type}:</label>
                          <input
                            type="number"
                            value={instrument.change}
                            onChange={(e) => handleEditChange(catIndex, instIndex, e.target.value)}
                            className="flex-1 bg-gray-700 px-4 py-2 rounded"
                            placeholder="Enter change value (use - for negative)"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={cancelEdit}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          {data && !editMode && (
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <th className="px-6 py-4 text-left font-semibold"></th>
                    <th className="px-6 py-4 text-left font-semibold">Instrument</th>
                    <th className="px-6 py-4 text-right font-semibold">Change</th>
                    <th className="px-6 py-4 text-left font-semibold">Activity</th>
                    <th className="px-6 py-4 text-center font-semibold">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map((category) => (
                    <React.Fragment key={category.name}>
                      {category.instruments.map((instrument, instIndex) => (
                        <tr
                          key={`${category.name}-${instrument.type}`}
                          className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors"
                        >
                          {instIndex === 0 && (
                            <td
                              rowSpan={category.instruments.length}
                              className="px-6 py-4 font-bold text-xl bg-gray-800/30"
                            >
                              {category.name}
                            </td>
                          )}
                          <td className="px-6 py-4 font-semibold">{instrument.type}</td>
                          <td className={`px-6 py-4 text-right font-mono font-bold ${
                            instrument.change > 0 ? 'text-green-400' : instrument.change < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {formatChange(instrument.change)}
                          </td>
                          <td className={`px-6 py-4 ${
                            instrument.activity.includes('Bought') ? 'text-green-300' : 
                            instrument.activity.includes('Sold') ? 'text-red-300' : 'text-gray-400'
                          }`}>
                            {instrument.activity}
                          </td>
                          <td className="px-6 py-4">
                            <div className={`${getTrendColor(instrument.trend)} px-4 py-2 rounded-lg font-bold text-center flex items-center justify-center gap-2`}>
                              {getTrendIcon(instrument.trend)}
                              {instrument.trend}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  
                  <tr className="bg-black border-t-2 border-gray-600">
                    <td colSpan="4" className="px-6 py-4 text-center font-bold text-xl">
                      OVERALL TREND:
                    </td>
                    <td className="px-6 py-4">
                      <div className={`${getTrendColor(data.overallTrend === 'BEARISH' ? 'Bearish' : data.overallTrend === 'BULLISH' ? 'Bullish' : 'Neutral')} px-4 py-3 rounded-lg font-bold text-xl text-center flex items-center justify-center gap-2`}>
                        {getTrendIcon(data.overallTrend === 'BEARISH' ? 'Bearish' : data.overallTrend === 'BULLISH' ? 'Bullish' : 'Neutral')}
                        {data.overallTrend}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-3">Weightage Logic:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-2xl font-bold text-blue-400">3.0x</div>
                <div className="text-sm text-gray-300">FII (Highest Impact)</div>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-2xl font-bold text-purple-400">2.0x</div>
                <div className="text-sm text-gray-300">PRO</div>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-2xl font-bold text-green-400">1.0x</div>
                <div className="text-sm text-gray-300">RETAIL (Client)</div>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-2xl font-bold text-gray-400">0.3x</div>
                <div className="text-sm text-gray-300">DII (Low Impact)</div>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold mb-3 mt-6">How to Update Data Daily:</h3>
            <ol className="space-y-2 text-gray-300 list-decimal list-inside">
              <li><strong className="text-green-400">Upload JSON:</strong> Click "Upload JSON" button and select your JSON file</li>
              <li><strong className="text-purple-400">Edit Manually:</strong> Click "Edit Data" to input values directly</li>
              <li><strong className="text-yellow-400">Download:</strong> Save current data as JSON for backup</li>
              <li>Trends are automatically calculated based on:
                <ul className="ml-8 mt-2 space-y-1 list-disc list-inside text-sm">
                  <li><strong>Bearish:</strong> Sold Futures, Sold Calls, Bought Puts</li>
                  <li><strong>Bullish:</strong> Bought Futures, Bought Calls, Sold Puts</li>
                  <li><strong>DII Neutral</strong> positions excluded from overall trend</li>
                  <li><strong>Overall Trend:</strong> FII (3x), PRO (2x), Retail (1x), DII (0.3x)</li>
                </ul>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            Made with <span className="text-red-500 animate-pulse">❤️</span> by <span className="font-semibold text-white">Ganesh V M</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FIIDIITracker;
