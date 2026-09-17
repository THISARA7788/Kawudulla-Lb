import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import HeroBorrowingChart from './HeroBorrowingChart';
import BookProfileModal from '../books/BookProfileModal';
import { getEmptyBookCoverBackground } from '../../utils/bookCoverUtils';

export default function TeacherDashboardMain() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [yearlyStats, setYearlyStats] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [hasHistory, setHasHistory] = useState(false);
  const [topCategories, setTopCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Good Morning', emoji: '🌅' };
    if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', emoji: '☀️' };
    if (hour >= 17 && hour < 21) return { text: 'Good Evening', emoji: '🌆' };
    return { text: 'Good Night', emoji: '🌙' };
  };

  const handleYearChange = async (selectedYear) => {
    if (!user?._id) return;
    try {
      const res = await api.get(`/library/quick-lookup/${user._id}?year=${selectedYear}`);
      if (res.data?.yearlyStats) {
        setYearlyStats(res.data.yearlyStats);
      }
    } catch (err) {
      console.error('Error fetching yearly stats for year:', selectedYear, err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [profileRes, recRes] = await Promise.all([
          api.get(`/library/quick-lookup/${user._id}`),
          api.get('/library/recommended-books'),
        ]);
        setData(profileRes.data);
        if (profileRes.data?.yearlyStats) {
          setYearlyStats(profileRes.data.yearlyStats);
        }
        if (recRes.data) {
          setRecommendations(recRes.data.recommendations || []);
          setHasHistory(recRes.data.hasHistory || false);
          setTopCategories(recRes.data.topCategories || []);
        }
      } catch (err) {
        console.error('Error fetching teacher dashboard data:', err);
        setError('Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <span className="material-symbols-outlined animate-spin mb-2" style={{ fontSize: 32 }}>progress_activity</span>
        <p className="text-xs font-semibold">Loading teacher dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 text-red-600 rounded-2xl p-6 border border-red-100 max-w-lg mx-auto my-10 text-center">
        <span className="material-symbols-outlined mb-2" style={{ fontSize: 36 }}>error</span>
        <h3 className="font-bold text-sm">Dashboard Load Error</h3>
        <p className="text-xs mt-1 text-slate-500">{error || 'Unable to retrieve your borrowing records.'}</p>
      </div>
    );
  }

  const greeting = getGreeting();

  return (
    <div className="space-y-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* 1. Dynamic Hero Welcome Banner */}
      <div
        className="py-3.5 px-5 sm:py-4 sm:px-6 rounded-2xl relative overflow-hidden text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #4C0000 0%, #150000 100%)' }}
      >
        {/* Left: Greetings & Faculty Info */}
        <div className="relative z-10 flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-black mt-0.5 tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
            {greeting.text}, {(() => {
              const rawName = user?.name?.trim().split(/\s+/)[0] || 'Teacher';
              return rawName.charAt(0).toUpperCase() + rawName.slice(1);
            })()}! {greeting.emoji}
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Welcome back to your Kawudulla MV digital library space.
          </p>
        </div>

        {/* Right: Annual Borrowing Activity Chart */}
        <div className="relative z-10 flex-shrink-0">
          <HeroBorrowingChart
            yearlyStats={yearlyStats || data.yearlyStats}
            onYearChange={handleYearChange}
          />
        </div>
      </div>

      {/* 3. Recommended Books Showcase (Full Width) */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Recommended For You
              </h3>
              <p className="text-[10.5px] text-slate-400 font-medium">
                Curated educational and literature recommendations aligned with your interests
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/books')}
            className="text-xs font-bold text-[#9E0D0D] hover:text-[#7F0A0A] flex items-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors border border-slate-200/60"
          >
            Browse Library
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_forward</span>
          </button>
        </div>

        {recommendations.length === 0 ? (
          <div className="py-10 text-center text-slate-400 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined mb-1.5" style={{ fontSize: 32, opacity: 0.3 }}>menu_book</span>
            <p className="text-xs font-semibold text-slate-600">No recommendations available yet</p>
            <p className="text-[10.5px] text-slate-400 mt-0.5">Explore the catalog to discover books you love</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {recommendations.slice(0, 5).map((book) => (
              <div
                key={book._id}
                onClick={() => setSelectedBook(book)}
                className="bg-white hover:bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col group active:scale-[0.98]"
              >
                <div className="w-full aspect-[3/4] rounded-lg bg-slate-100 overflow-hidden mb-2 relative shadow-xs">
                  {book.coverImageUrl ? (
                    <img
                      src={book.coverImageUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-white/80 transition-transform duration-300 group-hover:scale-105"
                      style={{ background: getEmptyBookCoverBackground(book) }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 26 }}>menu_book</span>
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-[#9E0D0D] transition-colors leading-tight">
                  {book.title}
                </h4>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {book.author}
                </p>
                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[8.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 truncate">
                    {book.category || 'Recommended'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Profile Details Modal */}
      <BookProfileModal
        book={selectedBook}
        isOpen={!!selectedBook}
        onClose={() => setSelectedBook(null)}
      />
    </div>
  );
}
