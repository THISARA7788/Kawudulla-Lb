import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../api/axios';

const STATUS_OPTIONS = ['Available', 'Borrowed', 'Reserved'];

export default function BookFormModal({
  showModal,
  editingBook,
  form,
  saving,
  error,
  customCategory,
  setCustomCategory,
  handleChange,
  handleSave,
  setShowModal,
  CATEGORIES
}) {
  if (!showModal) return null;

  // Audio Synth Beep Helper
  const playBeep = (type = 'success') => {
    // Audio feedback disabled per user preference
  };

  // Hardware Scanner USB Listening Buffer
  useEffect(() => {
    if (!showModal) return;

    // Automatically focus the ISBN input field when the modal opens
    setTimeout(() => {
      if (isbnInputRef.current) {
        isbnInputRef.current.focus();
      }
    }, 50);

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      const interval = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Hardware scanners type keys within < 45ms intervals
      if (interval > 45) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        const cleanBuffer = buffer.trim();
        if (cleanBuffer.length >= 8 && /^\d+$/.test(cleanBuffer)) {
          e.preventDefault();
          e.stopPropagation();
          triggerIsbnSearch(cleanBuffer);
          buffer = '';
        }
      } else if (e.key && e.key.length === 1 && /^\d+$/.test(e.key)) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal, form]);

  // ISBN Processing States
  const [searchingIsbn, setSearchingIsbn] = useState(false);
  const [isbnSearchError, setIsbnSearchError] = useState('');
  const [duplicateBook, setDuplicateBook] = useState(null);

  const triggerIsbnSearch = async (isbnVal) => {
    if (!isbnVal || !isbnVal.trim()) return;
    const cleanIsbn = isbnVal.trim().replace(/[-\s]/g, '');
    setSearchingIsbn(true);
    setIsbnSearchError('');
    setDuplicateBook(null);

    // Set ISBN value inside parent React form state
    handleChange({ target: { name: 'isbn', value: cleanIsbn } });

    try {
      // 1. Check local catalog duplication
      const checkRes = await api.get(`/books/check/${cleanIsbn}`);
      if (checkRes.data.exists) {
        playBeep('error');
        setDuplicateBook(checkRes.data.book);
        setSearchingIsbn(false);
        return;
      }

      // 2. Query Google Books API
      let bookData = null;
      try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const info = data.items[0].volumeInfo;
          bookData = {
            title: info.title || '',
            author: info.authors ? info.authors.join(', ') : '',
            publisher: info.publisher || '',
            publishedYear: info.publishedDate ? info.publishedDate.split('-')[0] : '',
            description: info.description || '',
            coverImageUrl: info.imageLinks ? (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail) : '',
          };
        }
      } catch (gErr) {
        console.warn('Google Books query failed, attempting Open Library fallback...', gErr);
      }

      // 3. Fallback to Open Library API
      if (!bookData) {
        try {
          const olResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
          const olData = await olResponse.json();
          const key = `ISBN:${cleanIsbn}`;
          if (olData[key]) {
            const info = olData[key];
            bookData = {
              title: info.title || '',
              author: info.authors ? info.authors.map(a => a.name).join(', ') : '',
              publisher: info.publishers ? info.publishers.map(p => p.name).join(', ') : '',
              publishedYear: info.publish_date ? info.publish_date.split(' ').pop() : '',
              description: typeof info.notes === 'string' ? info.notes : '',
              coverImageUrl: info.cover ? (info.cover.large || info.cover.medium || info.cover.small) : '',
            };
          }
        } catch (olErr) {
          console.warn('Open Library fallback failed:', olErr);
        }
      }

      if (bookData) {
        playBeep('success');
        // Auto populate fields by mimicking target changes
        Object.keys(bookData).forEach(key => {
          handleChange({ target: { name: key, value: bookData[key] } });
        });
      } else {
        playBeep('error');
        setIsbnSearchError('ISBN code not found in databases. Please enter details manually.');
      }
    } catch (err) {
      playBeep('error');
      setIsbnSearchError('Network error while performing lookup.');
      console.error(err);
    } finally {
      setSearchingIsbn(false);
    }
  };

  // HTML5-QRCode Camera Scanner States
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState('');
  const html5QrCodeRef = useRef(null);
  const isbnInputRef = useRef(null);

  const startCamera = async () => {
    setCameraError('');
    setShowCamera(true);
    setTimeout(async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          const targetCamId = backCam ? backCam.id : devices[0].id;
          setActiveCameraId(targetCamId);
          await initScanner(targetCamId);
        } else {
          setCameraError('No video input hardware detected.');
        }
      } catch (err) {
        setCameraError('Failed to list system cameras: ' + err.message);
      }
    }, 150);
  };

  const initScanner = async (cameraId) => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {}
    }

    const scanner = new Html5Qrcode("camera-reader");
    html5QrCodeRef.current = scanner;

    try {
      await scanner.start(
        cameraId,
        {
          fps: 12,
          qrbox: { width: 280, height: 160 } // optimized barcode scan viewport ratio
        },
        (decodedText) => {
          stopCamera();
          triggerIsbnSearch(decodedText);
        },
        (errorMessage) => {
          // ignore stream parse warnings
        }
      );
    } catch (err) {
      setCameraError('Camera failed to start: ' + err.message);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }
    setShowCamera(false);
  };

  const handleCameraChange = async (e) => {
    const newId = e.target.value;
    setActiveCameraId(newId);
    await initScanner(newId);
  };

  // Image Upload Canvas Compression & Cloudinary API
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_HEIGHT = 800; // Optimal height for high quality cover image thumbnails
          let width = img.width;
          let height = img.height;

          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.82 // 82% quality compression
          );
        };
      };
    });
  };

  const handleImageFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please provide a valid image cover file (JPEG/PNG/WEBP).');
      return;
    }

    setUploadingImage(true);
    setUploadProgress(0);

    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('coverImage', compressed);

      const response = await api.post('/books/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        },
      });

      if (response.data && response.data.secure_url) {
        handleChange({ target: { name: 'coverImageUrl', value: response.data.secure_url } });
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to upload image. Verify Cloudinary variables.');
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
      <div
        className="rounded-2xl p-6 w-full max-w-xl mx-4 shadow-2xl transition-all"
        style={{ backgroundColor: '#fff', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1a1245', fontFamily: "'Manrope', sans-serif" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>menu_book</span>
              {editingBook ? 'Edit Book Details' : 'Add New Book to Catalog'}
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">Fill book information manually or use barcode lookup</p>
          </div>
          <button onClick={() => { stopCamera(); setShowModal(false); }} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" style={{ color: '#94a3b8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        {/* Local DB Duplicate Match Overlay */}
        {duplicateBook && (
          <div className="p-4 rounded-xl mb-4 border animate-fadeIn flex flex-col gap-2.5" style={{ backgroundColor: '#fff7ed', borderColor: '#ffedd5' }}>
            <div className="flex gap-2 items-start text-orange-800">
              <span className="material-symbols-outlined text-orange-600 mt-0.5">warning</span>
              <div>
                <p className="text-sm font-bold">This Book Already Exists in Database</p>
                <p className="text-xs opacity-90">An item with ISBN {duplicateBook.isbn} is already listed under Catalog ID: {duplicateBook.bookId}</p>
              </div>
            </div>
            
            <div className="flex gap-3 items-center bg-white p-3 rounded-lg border border-orange-100">
              {duplicateBook.coverImageUrl ? (
                <img src={duplicateBook.coverImageUrl} alt="Book Cover" className="w-9 h-12 object-cover rounded shadow" />
              ) : (
                <div className="w-9 h-12 bg-slate-100 flex items-center justify-center rounded border border-dashed"><span className="material-symbols-outlined text-slate-400" style={{ fontSize: 16 }}>image</span></div>
              )}
              <div>
                <h4 className="text-xs font-bold text-slate-800">{duplicateBook.title}</h4>
                <p className="text-[10px] text-slate-500">by {duplicateBook.author} • Copies: {duplicateBook.availableCopies}/{duplicateBook.totalCopies}</p>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end mt-1">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const newTotal = (duplicateBook.totalCopies || 0) + 1;
                    await api.put(`/library/books/${duplicateBook._id}`, { totalCopies: newTotal });
                    playBeep('success');
                    alert(`Successfully increased copies of "${duplicateBook.title}" to ${newTotal}.`);
                    setShowModal(false);
                    window.location.reload();
                  } catch (e) {
                    alert('Failed to increment copies.');
                  }
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm hover:shadow"
                style={{ backgroundColor: '#c2410c' }}
              >
                Increment Stock (+1 Copy)
              </button>
              <button
                type="button"
                onClick={() => setDuplicateBook(null)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Ignore, Catalog As Unique
              </button>
            </div>
          </div>
        )}

        {/* Global Errors */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
            {error}
          </div>
        )}

        {/* ISBN Warning */}
        {isbnSearchError && (
          <div className="mb-4 px-4 py-2.5 rounded-xl text-xs font-medium border flex items-center gap-2" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#b45309' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>info</span>
            {isbnSearchError}
          </div>
        )}

        {/* Toggleable Camera QR/Barcode Drawer */}
        {showCamera && (
          <div className="mb-4 p-4 rounded-xl border relative bg-slate-900 border-slate-700 shadow-inner">
            <div className="flex justify-between items-center mb-2.5">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="animate-pulse w-2 h-2 rounded-full bg-green-500"></span>
                Camera Live Feed
              </label>
              
              <div className="flex items-center gap-2">
                {cameras.length > 1 && (
                  <select
                    value={activeCameraId}
                    onChange={handleCameraChange}
                    className="text-[11px] px-2 py-1 bg-slate-800 text-white border border-slate-700 rounded-md outline-none"
                  >
                    {cameras.map(c => <option key={c.id} value={c.id}>{c.label || `Camera ${cameras.indexOf(c) + 1}`}</option>)}
                  </select>
                )}
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {cameraError && <div className="text-red-400 text-xs py-2">{cameraError}</div>}

            <div className="overflow-hidden rounded-lg bg-black flex justify-center items-center border border-slate-800">
              <div id="camera-reader" className="w-full max-w-sm"></div>
            </div>
            
            <p className="text-[10px] text-center text-slate-400 mt-2">Center the book barcode inside the focus viewport box</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Main Book Meta Section (Autofill Helpers) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Barcode Scanning Integration</span>
              {!showCamera && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-2.5 py-1 text-xs font-bold flex items-center gap-1 bg-white border border-slate-205 rounded-lg shadow-sm hover:bg-slate-100 transition-colors text-slate-700"
                >
                  <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 16 }}>videocam</span>
                  Open Camera Scanner
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#595c5e' }}>ISBN-10 or ISBN-13 Code</label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: 18 }}>barcode_reader</span>
                  <input
                    ref={isbnInputRef}
                    autoFocus
                    name="isbn"
                    value={form.isbn || ''}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        triggerIsbnSearch(form.isbn);
                      }
                    }}
                    placeholder="Scan barcode or enter ISBN..."
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none border transition-all"
                    style={{ backgroundColor: '#fff', borderColor: '#e0e0e0' }}
                  />
                  {searchingIsbn && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                      <span className="material-symbols-outlined animate-spin text-slate-400" style={{ fontSize: 18 }}>progress_activity</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={searchingIsbn || !form.isbn}
                  onClick={() => triggerIsbnSearch(form.isbn)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-white shadow-sm transition-all flex items-center gap-1"
                  style={{ backgroundColor: '#1a1245', opacity: searchingIsbn || !form.isbn ? 0.6 : 1 }}
                >
                  Lookup
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Press Enter inside field or connect hardware USB scanner to scan at any time</p>
            </div>
          </div>

          {/* Catalog Record Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#595c5e' }}>Title *</label>
              <input name="title" value={form.title || ''} onChange={handleChange} required
                className="w-full px-3 py-2 text-sm rounded-xl outline-none border focus:border-slate-400"
                style={{ backgroundColor: '#fff', borderColor: '#e0e0e0' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#595c5e' }}>Author *</label>
              <input name="author" value={form.author || ''} onChange={handleChange} required
                className="w-full px-3 py-2 text-sm rounded-xl outline-none border focus:border-slate-400"
                style={{ backgroundColor: '#fff', borderColor: '#e0e0e0' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold mb-1" style={{ color: '#595c5e' }}>Category *</label>
              <select name="category" value={CATEGORIES.includes(form.category) ? form.category : 'Other'} onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-xl outline-none border focus:border-slate-400"
                style={{ backgroundColor: '#fff', borderColor: '#e0e0e0', color: '#2C2C3E' }}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                {!CATEGORIES.includes(form.category) && <option value="Other">{form.category}</option>}
              </select>
              {(form.category === 'Other') && (
                <input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category" required
                  className="w-full mt-2 px-3 py-2 text-sm rounded-xl outline-none border focus:border-slate-400"
                  style={{ backgroundColor: '#fff', borderColor: '#e0e0e0', color: '#2C2C3E' }}
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#595c5e' }}>Total Copies</label>
              <input name="totalCopies" type="number" min="1" value={form.totalCopies || 1} onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-xl outline-none border focus:border-slate-400"
                style={{ backgroundColor: '#fff', borderColor: '#e0e0e0' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold mb-1" style={{ color: '#595c5e' }}>Publisher</label>
              <input name="publisher" value={form.publisher || ''} onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-xl outline-none border focus:border-slate-400"
                style={{ backgroundColor: '#fff', borderColor: '#e0e0e0' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#595c5e' }}>Published Year</label>
              <input name="publishedYear" type="number" value={form.publishedYear || ''} onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-xl outline-none border focus:border-slate-400"
                style={{ backgroundColor: '#fff', borderColor: '#e0e0e0' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#595c5e' }}>Library Circulation Status</label>
              <select
                name="status"
                value={form.status || 'Available'}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-xl outline-none border focus:border-slate-400"
                style={{ backgroundColor: '#fff', borderColor: '#e0e0e0', color: '#2C2C3E' }}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: '#595c5e' }}>Book ID (Auto Generated)</label>
              <input
                value={form.bookId || editingBook?.bookId || 'BKXXXX (on save)'}
                readOnly
                disabled
                className="w-full px-3 py-2 text-sm rounded-xl outline-none border font-mono font-bold"
                style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: '#595c5e' }}>Description / Synopsis</label>
            <textarea name="description" value={form.description || ''} onChange={handleChange} rows="2"
              className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none border focus:border-slate-400"
              style={{ backgroundColor: '#fff', borderColor: '#e0e0e0' }}
            />
          </div>

          {/* Book Cover Image Upload Section */}
          <div className="border-t pt-4">
            <label className="block text-xs font-bold mb-2 text-slate-700">Cover Book Illustration</label>
            
            <div className="flex gap-4 items-center">
              {/* Cover Image Preview */}
              <div className="relative w-20 h-28 flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm flex items-center justify-center">
                {form.coverImageUrl ? (
                  <>
                    <img src={form.coverImageUrl} alt="Book cover" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleChange({ target: { name: 'coverImageUrl', value: '' } })}
                      className="absolute top-1 right-1 p-0.5 bg-red-650 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors"
                      style={{ backgroundColor: '#dc2626' }}
                    >
                      <span className="material-symbols-outlined text-[12px]">delete</span>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined text-[28px]">image</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider">No Cover</span>
                  </div>
                )}
              </div>

              {/* Drag and Drop Zone */}
              <div
                className={`flex-1 border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer ${
                  dragActive ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('cover-file-input').click()}
              >
                <input
                  id="cover-file-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {uploadingImage ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-slate-400" style={{ fontSize: 24 }}>progress_activity</span>
                    <span className="text-xs font-semibold text-slate-600">Uploading cover image... {uploadProgress}%</span>
                    <div className="w-full max-w-[150px] bg-slate-105 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                    <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                    <p className="text-xs font-semibold">
                      Drag & drop cover art or <span className="text-indigo-600 font-bold hover:underline">browse files</span>
                    </p>
                    <p className="text-[9px] text-slate-400">Allowed formats: PNG, JPG, JPEG, WEBP. Auto-compressed.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-3 border-t">
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white shadow hover:opacity-95 transition-opacity"
              style={{ backgroundColor: '#1a1245', opacity: saving || uploadingImage ? 0.6 : 1 }}
            >
              {saving ? 'Saving Book...' : editingBook ? 'Save Update' : 'Catalog Book'}
            </button>
            <button
              type="button"
              onClick={() => { stopCamera(); setShowModal(false); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors hover:bg-slate-50"
              style={{ borderColor: '#1a1245', color: '#1a1245' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
