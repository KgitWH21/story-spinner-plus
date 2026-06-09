import ResultCard from './ResultCard'
import RegisterForm from './RegisterForm'
import { saveSpin } from '../api/client'

export default function OutputOverlay({
  show,
  result,
  mode,
  isFlipped,
  onFlip,
  onUnflip,
  onClose,
  onSpinAgain,
  onAuthSuccess,
  onSaveSuccess,
  pendingSpin,
}) {
  const handleSave = () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      onFlip()
      return
    }
    saveSpin({ spin_type: mode, payload: result, user_notes: '' })
      .then(() => onSaveSuccess('Saved to Untitled Project'))
      .catch(console.error)
  }

  const handleAuthSuccess = async (authData) => {
    let projectId = authData.default_project_id
    // Claim the pending spin immediately after registration
    if (pendingSpin) {
      try {
        await saveSpin({
          spin_type: pendingSpin.mode,
          payload: pendingSpin.result,
          project_id: projectId,
          user_notes: '',
        })
      } catch (err) {
        console.error('Failed to claim pending spin', err)
      }
    }
    onUnflip()
    onAuthSuccess(authData)
    onSaveSuccess('Saved to Untitled Project')
  }

  return (
    <div className={`output-overlay fixed bottom-0 left-0 right-0 z-20 ${show ? 'is-visible' : ''}`}>
      {/* Drag handle + close */}
      <div className="relative flex justify-center items-center pt-3 pb-1 bg-surface-container-high rounded-t-2xl border-t border-outline-variant">
        <div className="w-10 h-1 rounded-full bg-outline-variant" />
        <button
          onClick={onClose}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors p-1"
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>

      {/* Card container with 3D flip */}
      <div className="bg-surface-container-high flip-container" style={{ height: 360 }}>
        <div className={`flip-inner w-full h-full ${isFlipped ? 'is-flipped' : ''}`}>
          {/* Front: ResultCard */}
          <div className="flip-front overflow-hidden">
            <ResultCard
              result={result}
              mode={mode}
              onSave={handleSave}
              onSpinAgain={onSpinAgain}
            />
          </div>
          {/* Back: RegisterForm */}
          <div className="flip-back overflow-hidden">
            <RegisterForm
              onSuccess={handleAuthSuccess}
              onCancel={onUnflip}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
