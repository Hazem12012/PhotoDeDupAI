# Duplicate Image Remover

A powerful desktop application for detecting and removing duplicate images using advanced computer vision algorithms.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.7+-blue.svg)
![Electron](https://img.shields.io/badge/electron-latest-blue.svg)

## Features

- 🔍 **Intelligent Detection**: Uses perceptual hashing (dHash), SSIM, and MSE algorithms
- 🎨 **Modern UI**: Beautiful, responsive interface built with React and Electron
- ⚡ **Real-time Progress**: Live updates during the duplicate detection process
- 🎯 **Two Removal Modes**:
  - **Custom Mode**: Keeps the highest numbered filename
  - **Standard Mode**: Keeps the widest (highest resolution) image
- 🔄 **Server Status Monitoring**: Visual indicator for backend connection status
- 📊 **Detailed Progress Logs**: See exactly what the algorithm is doing

## How It Works

1. **dHash (Difference Hash)**: Quickly identifies potential duplicates by comparing perceptual hashes
2. **SSIM (Structural Similarity Index)**: Measures structural similarity between images
3. **MSE (Mean Squared Error)**: Calculates pixel-level differences
4. **Smart Selection**: Automatically keeps the best version based on your chosen mode

## Prerequisites

### Python Requirements
- Python 3.7 or higher
- pip (Python package manager)

### Node.js Requirements
- Node.js 14 or higher
- npm (comes with Node.js)

## Installation

### 1. Clone or Download the Repository

```bash
cd duplicate-image-remover-master
```

### 2. Install Python Dependencies

```bash
pip install flask flask-cors opencv-python scikit-image numpy tqdm
```

Or use the requirements file if available:

```bash
pip install -r requirements.txt
```

### 3. Install Node.js Dependencies

```bash
npm install
```

## Usage

### Step 1: Start the Backend Server

Open a terminal and run:

```bash
python start_backend.py
```

Or directly:

```bash
python Backend/server.py
```

You should see:
```
============================================================
  Duplicate Image Remover - Backend Server
============================================================

Server starting on http://127.0.0.1:5000
Press Ctrl+C to stop the server

============================================================
```

**Keep this terminal window open!** The server must be running for the application to work.

### Step 2: Start the Electron Application

Open a **new** terminal window and run:

```bash
npm start
```

This will launch the desktop application.

### Step 3: Use the Application

1. **Check Server Status**: Look for the green "Server: online" indicator at the top
2. **Select Folder**: Click "Choose Folder" and select a directory containing images
3. **Choose Mode**:
   - **Custom Mode**: Keeps the image with the highest numbered filename
   - **Standard Mode**: Keeps the widest (highest resolution) image
4. **Start Processing**: Click "Remove Duplicates"
5. **Monitor Progress**: Watch the real-time progress updates
6. **Review Results**: Check the final statistics when complete

## Project Structure

```
duplicate-image-remover-master/
├── Backend/
│   └── server.py              # Flask backend server
├── src/
│   ├── components/
│   │   ├── DuplicateRemover.jsx  # Main UI component
│   │   └── Test_cloud.jsx        # Old test component
│   ├── main.js                # Electron main process
│   ├── preload.js             # Electron preload script
│   ├── renderer.jsx           # React renderer entry
│   └── index.css              # Styles
├── remove_duplicates.py       # Standalone CLI version
├── start_backend.py           # Backend launcher script
├── package.json               # Node.js dependencies
└── README.md                  # This file
```

## API Endpoints

The backend server provides the following REST API endpoints:

- `GET /api/health` - Check if server is running
- `GET /api/status` - Get current processing status and progress
- `POST /api/start` - Start duplicate detection process
  ```json
  {
    "directory": "/path/to/images",
    "custom": true
  }
  ```

## Removal Modes Explained

### Custom Mode (Recommended for numbered files)
- Keeps the image with the **highest numbered filename**
- Example: If you have `001.jpg`, `002.jpg`, `003.jpg` as duplicates, it keeps `003.jpg`
- Best for: Sequentially numbered photo collections

### Standard Mode (Recommended for general use)
- Keeps the **widest (highest resolution)** image
- Example: If you have images of different sizes, it keeps the largest one
- Best for: Mixed collections with varying resolutions

## Important Notes

⚠️ **Backup Your Images**: Always backup your images before running the duplicate remover. Deleted files cannot be recovered!

⚠️ **Server Required**: The backend server must be running for the application to work.

⚠️ **Processing Time**: Large folders may take several minutes to process.

⚠️ **Supported Formats**: JPG, JPEG, PNG, GIF, WEBP

## Troubleshooting

### Server Status Shows "offline"
- Make sure you started the backend server (`python start_backend.py`)
- Check if port 5000 is available (not used by another application)
- Try restarting the backend server

### "Failed to select folder" Error
- Make sure you have read/write permissions for the selected folder
- Try selecting a different folder

### No Duplicates Found
- The images might not be similar enough (SSIM < 0.95 or MSE > 20)
- Try different images or adjust the thresholds in the code

### Application Won't Start
- Make sure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be 14+)
- Try deleting `node_modules` and running `npm install` again

## Development

### Running in Development Mode

```bash
# Terminal 1: Start backend
python start_backend.py

# Terminal 2: Start Electron in dev mode
npm start
```

### Building for Production

```bash
npm run package
```

This will create a distributable package in the `out` folder.

## Technologies Used

### Frontend
- **Electron**: Desktop application framework
- **React**: UI library
- **Lucide React**: Icon library
- **Tailwind CSS**: Styling framework

### Backend
- **Flask**: Python web framework
- **OpenCV**: Image processing
- **scikit-image**: SSIM calculation
- **NumPy**: Numerical operations

## Algorithm Details

### dHash (Difference Hash)
1. Resize image to 9x8 pixels
2. Compare adjacent pixels horizontally
3. Generate a 64-bit hash
4. Group images with identical hashes

### SSIM & MSE Comparison
1. Resize images to 8x8 for comparison
2. Calculate SSIM (threshold: > 0.95)
3. Calculate MSE (threshold: < 20)
4. Images meeting both criteria are considered duplicates

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Created by Hazem12012

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.

---

**Remember**: Always backup your images before running any duplicate removal tool!
