import axios from 'axios';
export async function analyze(source, options) {
  try { return (await axios.post('/api/format', { source, options }, { timeout: 30000 })).data; }
  catch (error) {
    if (error.response?.data?.diagnostics) return error.response.data;
    throw new Error('Cannot reach the compiler. Start the Flask backend on port 5000.');
  }
}
