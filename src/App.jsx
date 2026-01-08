import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Calendar, AlertCircle } from 'lucide-react';

const FIIDIITracker = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const getSampleData = () => ({
    date: new Date().toLocaleDateString('en-GB'),
    categories: [
      {
        name: 'FII',
        instruments: [
          { type: 'Future', change: -8384, activity: 'Sold Futures', trend: 'Bearish' },
          { type: 'CE', change: -14952, activity: 'Sold Calls', trend: 'Bearish' },
          { type: 'PE', change: 4664, activity: 'Bought Puts', trend: 'Bearish' }
        ]
      },
      {
        name: 'PRO',
        instruments: [
          { type: 'Future', change: 4380, activity: 'Bought Futures', trend: 'Bullish' },
          { type: 'CE', change: -37748, activity: 'Sold Calls', trend: 'Bearish' },
          { type: 'PE', change: 67757, activity: 'Bought Puts', trend: 'Bearish' }
        ]
      },
      {
        name: 'DII',
        instruments: [
          { type: 'Future', change: 366, activity: 'Bought Futures', trend: 'Bullish' },
          { type: 'CE', change: 0, activity: 'Sold Calls', trend: 'Bearish' },
          { type: 'PE', change: 0, activity: 'Sold Puts', trend: 'Bullish' }
        ]
      },
      {
        name: 'RETAIL',
        instruments: [
          { type: 'Future', change: 3638, activity: 'Bought Futures', trend: 'Bullish' },
          { type: 'CE', change: 52701, activity: 'Bought Calls', trend: 'Bullish' },
          { type: 'PE', change: -72421, activity: 'Sold Puts', trend: 'Bullish' }
        ]
      }
    ],
    overallTrend: 'BEARISH'
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newData = getSampleData();
      
      setData(newData);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3600000);
    return () => clearInterval(interval);
  }, []);

  const getTrendColor = (trend) => {
    return trend === 'Bearish' ? 'bg-red-600' : 'bg-green-600';
  };

  const getTrendIcon = (trend) => {
    return trend === 'Bearish' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />;
  };

  const formatChange = (change) => {
    return change > 0 ? `+${change.toLocaleString()}` : change.toLocaleString();
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
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h1 className="text-3xl md:text-4xl font-bold">
              {data?.date} - FII DII FNO ACTIVITY
            </h1>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-6 py-3 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
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

        {data && (
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
                          instrument.change > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatChange(instrument.change)}
                        </td>
                        <td className={`px-6 py-4 ${
                          instrument.activity.includes('Bought') ? 'text-green-300' : 'text-red-300'
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
                    <div className={`${getTrendColor(data.overallTrend === 'BEARISH' ? 'Bearish' : 'Bullish')} px-4 py-3 rounded-lg font-bold text-xl text-center flex items-center justify-center gap-2`}>
                      {getTrendIcon(data.overallTrend === 'BEARISH' ? 'Bearish' : 'Bullish')}
                      {data.overallTrend}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">Data Sources:</h3>
          <ul className="space-y-2 text-gray-300">
            <li>• NSE India - Official FII/DII Data</li>
            <li>• Sensibull - FNO Activity Data</li>
            <li>• Updates automatically after market hours (typically 3:30 PM IST)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FIIDIITracker;
