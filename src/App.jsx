import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Calendar, AlertCircle, Edit, Upload, Download, Menu, X } from 'lucide-react';

const FIIDIITracker = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Weightage configuration
  const WEIGHTAGE = {
    FII: 3.0,
    PRO: 2.0,
    RETAIL: 1.0,
    DII: 0.3
  };

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

  const calculateTrend = (instrument, change, activity) => {
    if (change === 0) return 'Neutral';
    
    if (activity === 'Sold Futures' || activity === 'Sold Calls' || activity === 'Bought Puts') {
      return 'Bearish';
    }
    if (activity === 'Bought Futures' || activity === 'Bought Calls' || activity === 'Sold Puts') {
      return 'Bullish';
    }
    return 'Neutral';
  };

  const calculateOverallTrend = (categories) => {
    let bearishScore = 0;
    let bullishScore = 0;

    categories.forEach(cat => {
      const weightage = WEIGHTAGE[cat.name] || 1.0;
      
      cat.instruments.forEach(inst => {
        const absChange = Math.abs(inst.change);
        
        if (cat.name === 'DII' && inst.trend === 'Neutral') {
          return;
        }
        
        const weightedChange = absChange * weightage;
        
        if (inst.trend === 'Bearish') {
          bearishScore += weightedChange;
        } else if (inst.trend === 'Bullish') {
          bullishScore += weightedChange;
        }
      });
    });

    const total = bearishScore + bullishScore;
    if (total === 0) return 'NEUTRAL';
    
    const bearishPercent = (bearishScore / total) * 100;
    const bullishPercent = (bullishScore / total) * 100;
    
    if (Math.abs(bearishPercent - bullishPercent) < 5) {
      return 'NEUTRAL';
    }
    
    return bearishScore > bullishScore ? 'BEARISH' : 'BULLISH';
  };

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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
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

      const stored = localStorage.getItem('fii-dii-data');
      if (stored) {
        const rawData = JSON.parse(stored);
        const processed = processData(rawData);
        setData(processed);
        setLastUpdated(new Date().toLocaleString());
      } else {
        const defaultData = {
          date: new Date().toLocaleDateString('en-GB'),
          categories: [
            {
              name: 'FII',
              instruments: [
                { type: 'Future', change: 0 },
                { type: 'CE', change: 0 },
                { type: 'PE', change: 0 }
              ]
            },
            {
              name: 'PRO',
              instruments: [
                { type: 'Future', change: 0 },
                { type: 'CE', change: 0 },
                { type: 'PE', change: 0 }
              ]
            },
            {
              name: 'DII',
              instruments: [
                { type: 'Future', change: 0 },
                { type: 'CE', change: 0 },
                { type: 'PE', change: 0 }
              ]
            },
            {
              name: 'RETAIL',
              instruments: [
                { type: 'Future', change: 0 },
                { type: 'CE', change: 0 },
                { type: 'PE', change: 0 }
              ]
            }
          ]
        };
        
        const processed = processData(defaultData);
        setData(processed);
        setLastUpdated(new Date().toLocaleString());
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

  const startEdit = () => {
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
    
    setEditData(rawData);
    setEditMode(true);
    setMobileMenuOpen(false);
  };

  const handleEditChange = (categoryIndex, instrumentIndex, value) => {
    const newEditData = { ...editData };
    newEditData.categories[categoryIndex].instruments[instrumentIndex].change = parseInt(value) || 0;
    setEditData(newEditData);
  };

  const handleDateChange = (newDate) => {
    setEditData({ ...editData, date: newDate });
  };

  const saveEdit = () => {
    localStorage.setItem('fii-dii-data', JSON.stringify(editData));
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
    a.download = `fii-dii-data-${data.date.replace(/\//g, '-')}.json`;
    a.click();
    setMobileMenuOpen(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawData = JSON.parse(e.target.result);
        
        if (!rawData.date || !rawData.categories) {
          setError('Invalid JSON format. Must include "date" and "categories" fields.');
          return;
        }

        localStorage.setItem('fii-dii-data', JSON.stringify(rawData));
        const processed = processData(rawData);
        setData(processed);
        setLastUpdated(new Date().toLocaleString());
        setError(null);
        
        setTimeout(() => {
          alert('✅ Data uploaded successfully!');
        }, 100);
      } catch (err) {
        setError('Failed to parse JSON file. Please check the format.');
        console.error('JSON parse error:', err);
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
    setMobileMenuOpen(false);
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
      <div className="flex-grow p-3 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-start gap-4 mb-3">
              <div>
                <h1 className="text-xl md:text-4xl font-bold mb-1">
                  {data?.date}
                </h1>
                <p className="text-sm md:text-lg text-gray-400">FII DII FNO ACTIVITY</p>
              </div>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Desktop Buttons */}
              <div className="hidden md:flex gap-2">
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
                  title="Upload JSON file"
                >
                  <Upload className="w-5 h-5" />
                  Upload
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
                  Edit
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

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div className="md:hidden bg-gray-800 rounded-lg p-3 mb-3 space-y-2 border border-gray-700">
                <input
                  type="file"
                  id="json-upload"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={triggerFileUpload}
                  className="w-full flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg transition-colors justify-center"
                >
                  <Upload className="w-5 h-5" />
                  Upload JSON
                </button>
                <button
                  onClick={downloadJSON}
                  className="w-full flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg transition-colors justify-center"
                >
                  <Download className="w-5 h-5" />
                  Download JSON
                </button>
                <button
                  onClick={startEdit}
                  className="w-full flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-lg transition-colors justify-center"
                >
                  <Edit className="w-5 h-5" />
                  Edit Data
                </button>
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-4 py-3 rounded-lg transition-colors justify-center"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </button>
              </div>
            )}
            
            {lastUpdated && (
              <div className="flex items-center gap-2 text-gray-400 text-xs md:text-sm">
                <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                Last Updated: {lastUpdated}
              </div>
            )}

            {error && (
              <div className="mt-3 bg-red-900/50 border border-red-600 rounded-lg p-3 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-red-200 text-sm">{error}</span>
              </div>
            )}
          </div>

          {/* Edit Mode */}
          {editMode && editData && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-3 overflow-y-auto">
              <div className="bg-gray-800 rounded-lg p-4 md:p-6 max-w-4xl w-full max-h-[95vh] overflow-y-auto">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Edit Daily Data</h2>
                
                <div className="mb-4 bg-blue-900/30 border border-blue-600 rounded-lg p-4">
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    value={editData.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-gray-700 px-3 py-3 rounded text-sm md:text-base font-semibold"
                    placeholder="08/01/2026"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    This date will be shown in the header and used in the downloaded filename
                  </p>
                </div>

                {editData.categories.map((category, catIndex) => (
                  <div key={category.name} className="mb-4 border border-gray-700 rounded-lg p-3">
                    <h3 className="text-lg md:text-xl font-bold mb-3">
                      {category.name}
                      <span className="text-xs md:text-sm font-normal text-gray-400 ml-2">
                        (Weightage: {WEIGHTAGE[category.name]}x)
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {category.instruments.map((instrument, instIndex) => (
                        <div key={instrument.type} className="flex items-center gap-2">
                          <label className="w-16 md:w-24 font-semibold text-sm md:text-base">{instrument.type}:</label>
                          <input
                            type="number"
                            value={instrument.change}
                            onChange={(e) => handleEditChange(catIndex, instIndex, e.target.value)}
                            className="flex-1 bg-gray-700 px-3 py-2 rounded text-sm md:text-base"
                            placeholder="-1000"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm md:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm md:text-base"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Card View */}
          {data && !editMode && (
            <>
              <div className="md:hidden space-y-4">
                {data.categories.map((category) => (
                  <div key={category.name} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="bg-gray-700 px-4 py-3 font-bold text-lg">
                      {category.name}
                    </div>
                    <div className="p-3 space-y-3">
                      {category.instruments.map((instrument) => (
                        <div key={instrument.type} className="bg-gray-700/50 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-lg">{instrument.type}</span>
                            <div className={`${getTrendColor(instrument.trend)} px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
                              {getTrendIcon(instrument.trend)}
                              {instrument.trend}
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Change:</span>
                              <span className={`font-mono font-bold ${
                                instrument.change > 0 ? 'text-green-400' : instrument.change < 0 ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                {formatChange(instrument.change)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Activity:</span>
                              <span className={`font-semibold ${
                                instrument.activity.includes('Bought') ? 'text-green-300' : 
                                instrument.activity.includes('Sold') ? 'text-red-300' : 'text-gray-400'
                              }`}>
                                {instrument.activity}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Mobile Overall Trend */}
                <div className="bg-black rounded-lg border-2 border-gray-600 p-4">
                  <div className="text-center mb-3">
                    <h3 className="text-lg font-bold">OVERALL TREND</h3>
                  </div>
                  <div className={`${getTrendColor(data.overallTrend === 'BEARISH' ? 'Bearish' : data.overallTrend === 'BULLISH' ? 'Bullish' : 'Neutral')} px-6 py-4 rounded-lg font-bold text-2xl text-center flex items-center justify-center gap-3`}>
                    {getTrendIcon(data.overallTrend === 'BEARISH' ? 'Bearish' : data.overallTrend === 'BULLISH' ? 'Bullish' : 'Neutral')}
                    {data.overallTrend}
                  </div>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-700">
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
            </>
          )}

          {/* Info Section */}
          <div className="mt-6 bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700">
            <h3 className="text-base md:text-lg font-semibold mb-3">Weightage Logic:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
              <div className="bg-gray-700 p-2 md:p-3 rounded text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-400">3.0x</div>
                <div className="text-xs md:text-sm text-gray-300">FII</div>
              </div>
              <div className="bg-gray-700 p-2 md:p-3 rounded text-center">
                <div className="text-xl md:text-2xl font-bold text-purple-400">2.0x</div>
                <div className="text-xs md:text-sm text-gray-300">PRO</div>
              </div>
              <div className="bg-gray-700 p-2 md:p-3 rounded text-center">
                <div className="text-xl md:text-2xl font-bold text-green-400">1.0x</div>
                <div className="text-xs md:text-sm text-gray-300">RETAIL</div>
              </div>
              <div className="bg-gray-700 p-2 md:p-3 rounded text-center">
                <div className="text-xl md:text-2xl font-bold text-gray-400">0.3x</div>
                <div className="text-xs md:text-sm text-gray-300">DII</div>
              </div>
            </div>
            
            <h3 className="text-base md:text-lg font-semibold mb-2 mt-4">How to Update:</h3>
            <ol className="space-y-1 text-gray-300 list-decimal list-inside text-sm md:text-base">
              <li><strong className="text-green-400">Upload JSON:</strong> Include "date" field in DD/MM/YYYY format</li>
              <li><strong className="text-purple-400">Edit Manually:</strong> Update date and values directly</li>
              <li><strong className="text-yellow-400">Download:</strong> Saves with date in filename</li>
            </ol>
            
            <div className="mt-4 bg-gray-700/50 p-3 rounded text-sm">
              <p className="text-gray-300 mb-2"><strong>JSON Format Example:</strong></p>
              <pre className="text-xs text-green-400 overflow-x-auto">
{`{
  "date": "08/01/2026",
  "categories": [ ... ]
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-3 md:py-4 mt-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-xs md:text-sm">
            Made with <span className="text-red-500 animate-pulse">❤️</span> by <span className="font-semibold text-white">Ganesh V M</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FIIDIITracker;
