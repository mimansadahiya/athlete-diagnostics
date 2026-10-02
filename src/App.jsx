import { useState, useMemo, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { d1Benchmarks, topSchools, athleteProfile as mockProfile } from './mockData'
import { GraduationCap } from 'lucide-react'
import AthleteJourneyModal from './AthleteJourneyModal'
import HolisticDiagnosticsDashboard from './HolisticDiagnosticsDashboard'
import './App.css'

function App() {
  const [userRole, setUserRole] = useState('coach');
  const [activeTab, setActiveTab] = useState('Diagnostics');
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterConference, setFilterConference] = useState('All');
  const [filterEvent, setFilterEvent] = useState('All');

  useEffect(() => {
    async function fetchAthletes() {
      try {
        setLoading(true);
        if (!supabase) { setAthletes([]); return; }
        const { data, error } = await supabase
          .from('athletes')
          .select('*')
          .order('name', { ascending: true });
        
        if (!error && data) {
          setAthletes(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAthletes();
  }, []);

  useEffect(() => {
    if (selectedAthlete && supabase) {
      async function fetchPerformances() {
        const { data, error } = await supabase
          .from('athlete_performances')
          .select('*')
          .eq('athlete_id', selectedAthlete.id)
          .order('date', { ascending: true });
        
        if (!error) setPerformances(data || []);
      }
      fetchPerformances();
    }
  }, [selectedAthlete]);

  const [filterSchool, setFilterSchool] = useState('All');
  const [minMark, setMinMark] = useState('');

  const filteredRecruits = useMemo(() => {
    if (!athletes) return [];
    return athletes.filter(athlete => {
      const name = (athlete?.name || '').toLowerCase();
      const major = (athlete?.major || '').toLowerCase();
      const hometown = (athlete?.hometown || '').toLowerCase();
      const school = (athlete?.school || '').toLowerCase();
      const query = (searchQuery || '').toLowerCase();
      
      const matchesSearch = name.includes(query) || major.includes(query) || hometown.includes(query) || school.includes(query);
      const matchesEvent = filterEvent === 'All' || athlete?.primary_event === filterEvent;
      const matchesYear = filterConference === 'All' || athlete?.year === filterConference;
      const matchesSchool = filterSchool === 'All' || athlete?.school === filterSchool;
      
      return matchesSearch && matchesEvent && matchesYear && matchesSchool;
    });
  }, [athletes, searchQuery, filterEvent, filterConference, filterSchool]);

  const conferences = ['All', ...new Set(topSchools.map(s => s.conference))];
  const events = useMemo(() => {
    if (!athletes) return ['All'];
    const evs = athletes.map(a => a?.primary_event).filter(Boolean);
    return ['All', ...new Set(evs)];
  }, [athletes]);

  const schools = useMemo(() => {
    if (!athletes) return ['All'];
    const uniqueSchools = athletes.map(a => a?.school).filter(Boolean);
    return ['All', ...new Set(uniqueSchools)];
  }, [athletes]);

  if (loading) {
    return (
      <div className="app-shell loading">
        <div className="glass-panel" style={{ padding: '40px', borderRadius: '24px' }}>
          <div className="pulse" style={{ width: '60px', height: '60px', background: 'var(--accent)', borderRadius: '50%', margin: '0 auto 20px' }}></div>
          <h1>Initializing Recruiting Hub...</h1>
          <p>Connecting to Supabase • Fetching 92 Athletes</p>
        </div>
      </div>
    );
  }

  const renderAthleteDashboard = () => {
    // Simulate the logged-in athlete as the first athlete in the DB for demo purposes
    const myProfile = athletes.length > 0 ? athletes[0] : null;
    
    if (!myProfile) return <div style={{padding: '40px'}}>Loading profile...</div>;

    return (
      <section className="athlete-dashboard fade-in">
        <div className="card glass-panel profile-hero" style={{marginBottom: '30px', padding: '30px'}}>
          <h2 style={{fontSize: '2rem', marginBottom: '10px'}}>Welcome back, {myProfile.name}!</h2>
          <p style={{color: 'var(--text-muted)'}}>Update your recruiting profile to stand out to coaches.</p>
        </div>

        <div className="dashboard-main-grid">
          <div className="card glass-panel" style={{gridColumn: 'span 2'}}>
            <div className="card-header">
              <h2>My Details</h2>
            </div>
            <div className="edit-form" style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              <div className="form-group" style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Academic Major</label>
                <input type="text" defaultValue={myProfile.major !== 'N/A' ? myProfile.major : ''} placeholder="e.g. Kinesiology" style={{padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white'}} />
              </div>
              <div className="form-group" style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Hometown</label>
                <input type="text" defaultValue={myProfile.hometown !== 'N/A' ? myProfile.hometown : ''} placeholder="e.g. San Luis Obispo, CA" style={{padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white'}} />
              </div>
              <div className="form-group" style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Primary Event</label>
                <input type="text" defaultValue={myProfile.primary_event || ''} placeholder="e.g. 100m Dash" style={{padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white'}} />
              </div>
              <button className="pill active" style={{alignSelf: 'flex-start', padding: '12px 24px'}}>Save Changes</button>
            </div>
          </div>

          <div className="card glass-panel">
            <div className="card-header">
              <h2>Media Upload</h2>
            </div>
            <div className="upload-section">
              <p style={{marginBottom: '20px', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5'}}>Add your best race highlights from YouTube for coaches to review on your scouting card.</p>
              <div className="form-group" style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>YouTube Link</label>
                <input type="text" defaultValue={myProfile.extraction_metadata?.youtube_url || ''} placeholder="https://youtube.com/..." style={{padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white'}} />
              </div>
              <button className="pill" style={{marginTop: '20px', border: '1px solid var(--accent)', width: '100%'}}>Connect Video</button>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderCoachDashboard = () => (
    <section className="coach-dashboard fade-in">
      <div className="stats-row">
        <div className="stat-card glass-panel">
          <label>Total Recruits</label>
          <h2>{athletes.length}</h2>
          <div className="stat-trend positive">Live Data</div>
        </div>
        <div className="stat-card glass-panel">
          <label>With TFRRS</label>
          <h2>{athletes.filter(a => a.tfrrs_url).length}</h2>
          <div className="stat-trend">Verified</div>
        </div>
        <div className="stat-card glass-panel">
          <label>Majors Extracted</label>
          <h2>{athletes.filter(a => a.major && a.major !== 'N/A').length}</h2>
          <div className="stat-trend">AI Analysis</div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        <div className="card discovery-card glass-panel">
          <div className="card-header">
            <div className="header-with-count">
              <h2>Athlete Discovery</h2>
              <span className="count-badge">{filteredRecruits.length} Athletes Found</span>
            </div>
            <div className="filter-pills">
              {schools.map(s => (
                <button key={s} className={filterSchool === s ? 'pill active' : 'pill'} onClick={() => setFilterSchool(s)}>{s}</button>
              ))}
            </div>
            <div className="filter-pills" style={{ marginTop: '10px' }}>
              {['All', 'Senior', 'Junior', 'Sophomore', 'Freshman'].map(y => (
                <button key={y} className={filterConference === y ? 'pill active' : 'pill'} onClick={() => setFilterConference(y)}>{y}</button>
              ))}
            </div>
            <div className="filter-pills" style={{ marginTop: '10px' }}>
              {events.map(e => (
                <button key={e} className={filterEvent === e ? 'pill active' : 'pill'} onClick={() => setFilterEvent(e)}>{e}</button>
              ))}
            </div>
          </div>
          <div className="recruit-grid">
            {filteredRecruits.map(athlete => (
              <div key={athlete.id} className="recruit-item glass-panel" onClick={() => setSelectedAthlete(athlete)}>
                <div className="recruit-details">
                  <h3>{athlete.name}</h3>
                  <p>
                    {athlete.year && athlete.year !== 'N/A' ? athlete.year : 'Freshman'}
                    {athlete.major && athlete.major !== 'N/A' ? ` • ${athlete.major}` : ' • Undeclared'}
                  </p>
                  <div className="recruit-stats">
                    {athlete.hometown && athlete.hometown !== 'N/A' && (
                      <span>Hometown: <strong>{athlete.hometown}</strong></span>
                    )}
                    <span className="tag small">{athlete.primary_event || 'Track & Field'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card pipeline-card glass-panel">
          <div className="card-header">
            <h2>Live Pipeline</h2>
          </div>
          <div className="pipeline-list">
            {['Senior', 'Junior', 'Sophomore', 'Freshman'].map(year => (
              <div key={year} className="pipeline-group">
                <label className="status-label">{year}s</label>
                {athletes.filter(a => a.year === year).slice(0, 4).map(a => (
                  <div key={a.id} className="pipeline-item glass-panel">
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="app-shell" data-role={userRole}>
      <aside className="sidebar glass-panel">
        <div className="brand">
          <div className="logo-icon"></div>
          <span>ATHLETESCOUT</span>
        </div>
        
        <div className="role-switcher glass-panel">
          <button className={userRole === 'coach' ? 'active' : ''} onClick={() => setUserRole('coach')}>Coach</button>
          <button className={userRole === 'athlete' ? 'active' : ''} onClick={() => setUserRole('athlete')}>Athlete</button>
        </div>

        <nav className="side-nav">
          {[{ id: 'Dashboard', label: 'Scouting Hub' }, { id: 'Diagnostics', label: 'Diagnostics (New)' }].map(tab => (
            <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="school-badge glass-panel">
            <GraduationCap className="school-logo" size={38} />
            <div className="school-info">
              <span className="school-name">Example University</span>
              <span className="school-sub">Track &amp; Field · 2025–26</span>
            </div>
          </div>

          <div className="search-box glass-panel">
            <input 
              type="text" 
              placeholder="Search by name, major, or hometown..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          <div className="user-profile">
            <div className="profile-thumb"></div>
          </div>
        </header>

        {activeTab === 'Dashboard' && userRole === 'coach' && renderCoachDashboard()}
        {activeTab === 'Diagnostics' && <HolisticDiagnosticsDashboard onBack={() => setActiveTab('Dashboard')} />}
        {userRole === 'athlete' && activeTab !== 'Diagnostics' && renderAthleteDashboard()}
      </main>

      {selectedAthlete && (
        <AthleteJourneyModal
          athlete={selectedAthlete}
          performances={performances}
          onClose={() => setSelectedAthlete(null)}
        />
      )}
    </div>
  );
}

export default App;
