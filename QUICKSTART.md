# Quick Start Guide

Get up and running with Duplicate Image Remover in 3 simple steps!

## 🚀 Quick Setup (First Time Only)

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

Or manually:
```bash
pip install flask flask-cors opencv-python scikit-image numpy tqdm
```

### 2. Install Node.js Dependencies
```bash
npm install
```

## ▶️ Running the Application

### Method 1: Using Two Terminals (Recommended)

**Terminal 1 - Start Backend:**
```bash
python start_backend.py
```
Or on Windows, double-click: `start_backend.bat`

**Terminal 2 - Start Application:**
```bash
npm start
```

### Method 2: Using NPM Scripts

**Terminal 1:**
```bash
npm run backend
```

**Terminal 2:**
```bash
npm start
```

## 📋 Usage Steps

1. ✅ **Verify Server Status** - Look for green "Server: online" indicator
2. 📁 **Select Folder** - Click "Choose Folder" button
3. ⚙️ **Choose Mode**:
   - **Custom Mode**: Keeps highest numbered filename
   - **Standard Mode**: Keeps widest/largest image
4. 🚀 **Start Processing** - Click "Remove Duplicates"
5. 👀 **Monitor Progress** - Watch real-time updates
6. ✨ **Done!** - Check results when complete

## ⚠️ Important Reminders

- 💾 **BACKUP YOUR IMAGES FIRST!** Deleted files cannot be recovered
- 🔌 Backend server must be running before starting the app
- ⏱️ Large folders may take several minutes to process
- 🖼️ Supported formats: JPG, JPEG, PNG, GIF, WEBP

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Server shows "offline" | Start backend server first |
| Can't select folder | Check folder permissions |
| App won't start | Run `npm install` again |
| No duplicates found | Images may not be similar enough |

## 📚 Need More Help?

See the full [README.md](README.md) for detailed documentation.

---

**Happy Deduplicating! 🎉**
