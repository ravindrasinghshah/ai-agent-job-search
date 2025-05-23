'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  platform: string;
  url: string;
  postedDate: string;
}

export default function JobSearchDashboard() {
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jobListings, setJobListings] = useState<JobListing[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword }),
      });

      const data = await response.json();
      setJobListings(data);
    } catch (error) {
      console.error('Error searching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Multi-Platform Job Search
          </h1>
          
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Enter job title, skills, or keywords..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? (
                  'Searching...'
                ) : (
                  <div className="flex items-center gap-2">
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    Search
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white shadow rounded-lg">
          {jobListings.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {jobListings.map((job) => (
                <div key={job.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                          {job.title}
                        </a>
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {job.company} • {job.location}
                      </p>
                      {job.salary && (
                        <p className="mt-1 text-sm text-gray-500">{job.salary}</p>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {job.platform}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">{job.description}</p>
                  <p className="mt-2 text-xs text-gray-500">Posted: {job.postedDate}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              {isLoading ? 'Searching across platforms...' : 'Enter a search term to find jobs'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 