import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './config/firebase'
import './App.css'

const hasFirebaseConfig = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
)

function App() {
  const [confessions, setConfessions] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(hasFirebaseConfig)
  const [error, setError] = useState(
    hasFirebaseConfig
      ? ''
      : 'Add VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID to .env to connect Firestore.',
  )
  const [submitting, setSubmitting] = useState(false)

  // One-time read from Firestore on page load
  useEffect(() => {
    if (!hasFirebaseConfig) return undefined

    let ignore = false

    getDocs(query(collection(db, 'confessions'), orderBy('createdAt', 'desc')))
      .then((snapshot) => {
        if (ignore) return
        const docs = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        setConfessions(docs)
        setLoading(false)
      })
      .catch((err) => {
        if (ignore) return
        setError(err.message)
        setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  // Fetch confessions manually from Firestore
  async function loadConfessions() {
    if (!hasFirebaseConfig) return

    setLoading(true)
    setError('')
    try {
      const q = query(
        collection(db, 'confessions'),
        orderBy('createdAt', 'desc'),
      )
      const snapshot = await getDocs(q)
      const docs = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      setConfessions(docs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Write a new document to Firestore
  async function handleSubmit(e) {
    e.preventDefault()
    if (!hasFirebaseConfig) return
    const trimmed = text.trim()

    if (!trimmed) {
      setError('Write a confession before posting.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'confessions'), {
        text: trimmed,
        likes: 0,
        createdAt: serverTimestamp(),
      })
      setText('')
      await loadConfessions()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Update a document field in Firestore
  async function handleLike(id) {
    if (!hasFirebaseConfig) return
    try {
      await updateDoc(doc(db, 'confessions', id), {
        likes: increment(1),
      })
      await loadConfessions()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="container">
          <h1 className="title">Menfess</h1>
          <p className="subtitle">Anonymous confession board</p>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <form className="composer" onSubmit={handleSubmit}>
            <label htmlFor="confession" className="label">
              Your confession
            </label>
            <textarea
              id="confession"
              className="textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write something anonymously..."
              maxLength={500}
              disabled={submitting}
            />
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Posting...' : 'Post anonymously'}
            </button>
          </form>

          {error && (
            <div className="status-box status-box--error" role="alert">
              {error}
            </div>
          )}

          <section className="feed-section" aria-labelledby="feed-heading">
            <div className="feed-header">
              <h2 id="feed-heading" className="feed-heading">
                Recent confessions
              </h2>
              <button
                type="button"
                className="btn-like"
                onClick={loadConfessions}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="status-box" role="status">
                Loading confessions from Firestore...
              </div>
            ) : confessions.length === 0 ? (
              <div className="status-box">
                No confessions yet. Post the first one above.
              </div>
            ) : (
              <ul className="feed-list">
                {confessions.map((item) => (
                  <li key={item.id} className="card">
                    <p className="card-text">{item.text}</p>
                    <div className="card-footer">
                      <span>
                        {item.createdAt?.toDate
                          ? item.createdAt.toDate().toLocaleString()
                          : 'Just now'}
                      </span>
                      <button
                        type="button"
                        className="btn-like"
                        onClick={() => handleLike(item.id)}
                      >
                        Like ({item.likes ?? 0})
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container">Stored in Cloud Firestore.</div>
      </footer>
    </div>
  )
}

export default App
