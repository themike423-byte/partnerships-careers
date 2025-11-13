import React, { useState, useMemo, useEffect } from 'react';

const SHEETY_API = 'https://api.sheety.co/4ce55d1d0ad684ea192b042bd2f3b53d/partnershipsCareersDb/sheet1';

const LEVELS = ['Manager', 'Director', 'VP', 'Chief'];
const CATEGORIES = [
  'Ecosystem & Platform',
  'Channel & Reseller',
  'Strategic Alliances with Hyperscalers/SIs',
  'Product & OEM Partnerships',
  'Corporate Development & Venture Partnerships'
];

// Icons as simple SVG components
const Users = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const Briefcase = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
  </svg>
);

const MapPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const DollarSign = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const Star = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const Mail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const RefreshCw = ({ className }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

const LogIn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
    <polyline points="10 17 15 12 10 7"></polyline>
    <line x1="15" y1="12" x2="3" y2="12"></line>
  </svg>
);

function App() {
  const [jobs, setJobs] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(SHEETY_API);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const jobsArray = data.sheet1 || [];
      
      const transformedJobs = jobsArray.map(job => ({
        id: job.id?.toString() || '',
        title: job.title || '',
        company: job.company || '',
        location: job.location || '',
        type: job.type || '',
        salaryRange: job.salaryRange || '',
        level: job.level || '',
        category: job.category || '',
        description: job.description || '',
        postedDate: job.postedDate || '',
        employerId: job.employerId || '',
        link: job.link || '',
        isFeatured: job.isFeatured === true || job.isFeatured === 'TRUE'
      }));
      
      setJobs(transformedJobs);
      
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Error loading jobs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesLevel = selectedLevel === 'All' || job.level === selectedLevel;
      const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
      return matchesLevel && matchesCategory;
    });
  }, [jobs, selectedLevel, selectedCategory]);

  const featuredJobs = filteredJobs.filter(job => job.isFeatured);
  const regularJobs = filteredJobs.filter(job => !job.isFeatured);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="relative text-indigo-600">
                <Users />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">Partnerships Careers</div>
                <div className="text-xs text-gray-500">partnerships-careers.com</div>
              </div>
            </div>
            <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
              <LogIn />
              Employer Login
            </button>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Your Career in Partnerships Starts Here
              </h1>
              <p className="text-xl text-indigo-100 mb-6">
                Connect with top companies hiring for ecosystem, channel, strategic alliances, and partnership leadership roles.
              </p>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Mail />
                  <h3 className="font-semibold text-lg">Get Job Alerts</h3>
                </div>
                <p className="text-indigo-100 text-sm mb-4">Never miss a partnership opportunity.</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 rounded-lg text-gray-900"
                  />
                  <button className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition font-medium whitespace-nowrap">
                    Sign Up
                  </button>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <div className="font-bold text-2xl">{jobs.length}</div>
                  <div className="text-indigo-100">Active Jobs</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <div className="font-bold text-2xl">{new Set(jobs.map(j => j.company)).size}</div>
                  <div className="text-indigo-100">Companies</div>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <div className="mx-auto mb-2"><Users /></div>
                    <div className="text-sm">Network Growth</div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <div className="mx-auto mb-2"><Briefcase /></div>
                    <div className="text-sm">Career Growth</div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <div className="mx-auto mb-2"><Star /></div>
                    <div className="text-sm">Top Companies</div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <div className="mx-auto mb-2"><DollarSign /></div>
                    <div className="text-sm">Competitive Pay</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Filter Jobs</h3>
            <button
              onClick={fetchJobs}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
              disabled={loading}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Filter by Role Level
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedLevel('All')}
                className={`px-5 py-2.5 rounded-full font-medium transition ${
                  selectedLevel === 'All'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Levels
              </button>
              {LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-5 py-2.5 rounded-full font-medium transition ${
                    selectedLevel === level
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Filter by Partnership Type
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-5 py-2.5 rounded-full font-medium transition ${
                  selectedCategory === 'All'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-2.5 rounded-full font-medium transition ${
                    selectedCategory === category
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <RefreshCw className="mx-auto text-indigo-600 mb-4 animate-spin" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Loading jobs...</h3>
            <p className="text-gray-600">Fetching data from Google Sheets</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchJobs}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mb-4 text-gray-600">
              Showing {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
            </div>

            {featuredJobs.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Star />
                  <h2 className="text-2xl font-bold text-gray-900">Featured Jobs</h2>
                </div>
                <div className="space-y-4">
                  {featuredJobs.map(job => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </div>
            )}

            {regularJobs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">All Jobs</h2>
                <div className="space-y-4">
                  {regularJobs.map(job => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </div>
            )}

            {filteredJobs.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Briefcase />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No jobs found</h3>
                <p className="text-gray-600">Try adjusting your filters</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function JobCard({ job }) {
  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 ${job.isFeatured ? 'border-2 border-yellow-400' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
            {job.isFeatured && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                <Star />
                Featured
              </span>
            )}
          </div>
          <p className="text-lg text-gray-700 font-medium">{job.company}</p>
        </div>
        <div className="text-right">
          <span className="inline-block bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded-full font-medium">
            {job.level}
          </span>
        </div>
      </div>

      <p className="text-gray-600 mb-4">{job.description}</p>

      <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <MapPin />
          {job.location}
        </div>
        {job.salaryRange && job.salaryRange !== 'Unspecified' && (
          <div className="flex items-center gap-1">
            <DollarSign />
            {job.salaryRange}
          </div>
        )}
        {job.type && (
          <div className="flex items-center gap-1">
            <Briefcase />
            {job.type}
          </div>
        )}
      </div>

      <div className="mb-4">
        <span className="inline-block bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
          {job.category}
        </span>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <span className="text-sm text-gray-500">
          Posted {job.postedDate || 'Recently'}
        </span>
        
          href={job.link}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          Apply Now
        </a>
      </div>
    </div>
  );
}

export default App;
