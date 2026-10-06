import { useEffect, useState } from 'react'
import { db } from '../../firebase'
import { collection, addDoc, setDoc, updateDoc, deleteDoc, getDocs, getDoc, doc } from 'firebase/firestore'
import { parseExamDocx } from '../../utils/parseExamDocx'
import Icon from '../../components/Icon'

const CURRENCIES = ['SAR', 'EGP', 'USD', 'GBP']
const MAX_OPTIONS = 6

const labels = {
  ar: {
    title: 'الاختبارات', addExam: 'إضافة اختبار', editExam: 'تعديل الاختبار',
    uploadDocx: 'استيراد من ملف Word', uploading: 'جارٍ التحليل...',
    examTitle: 'عنوان الاختبار', description: 'الوصف (اختياري)', price: 'السعر', currency: 'العملة',
    questions: 'الأسئلة', addQuestion: 'إضافة سؤال', noQuestions: 'لا توجد أسئلة بعد',
    passage: 'نص مرجعي (اختياري)', stem: 'نص السؤال', options: 'الاختيارات',
    addOption: 'إضافة اختيار', removeOption: 'حذف', removeQuestion: 'حذف السؤال',
    needsReview: 'يحتاج مراجعة', markCorrect: 'صحيحة',
    save: 'حفظ ونشر', update: 'حفظ التعديلات', cancel: 'إلغاء',
    parsedCount: 'تم استخراج {n} سؤال، {r} منها يحتاج مراجعة سريعة',
    parseFailed: 'تعذّرت قراءة الملف. تأكد أنه ملف Word (.docx) صالح.',
    saveFailed: 'فشل الحفظ. تأكد من صلاحياتك وحاول مرة أخرى.\n\n',
    validationFailed: 'كل سؤال يحتاج نص سؤال، اختيارين على الأقل، وإجابة صحيحة محددة.',
    existingExams: 'الاختبارات الحالية', noExams: 'لا توجد اختبارات بعد',
    qCount: 'سؤال', edit: 'تعديل', delete: 'حذف',
    deleteConfirm: 'سيتم حذف هذا الاختبار نهائياً. هل أنت متأكد؟'
  },
  en: {
    title: 'Exams', addExam: 'Add Exam', editExam: 'Edit Exam',
    uploadDocx: 'Import from Word file', uploading: 'Parsing...',
    examTitle: 'Exam Title', description: 'Description (optional)', price: 'Price', currency: 'Currency',
    questions: 'Questions', addQuestion: 'Add Question', noQuestions: 'No questions yet',
    passage: 'Reference passage (optional)', stem: 'Question text', options: 'Options',
    addOption: 'Add option', removeOption: 'Remove', removeQuestion: 'Delete question',
    needsReview: 'Needs review', markCorrect: 'Correct',
    save: 'Save & Publish', update: 'Save Changes', cancel: 'Cancel',
    parsedCount: 'Extracted {n} questions, {r} need a quick review',
    parseFailed: 'Could not read that file. Make sure it is a valid Word (.docx) file.',
    saveFailed: 'Save failed. Check your permissions and try again.\n\n',
    validationFailed: 'Every question needs question text, at least two options, and a marked correct answer.',
    existingExams: 'Existing Exams', noExams: 'No exams yet',
    qCount: 'questions', edit: 'Edit', delete: 'Delete',
    deleteConfirm: 'This permanently deletes this exam. Are you sure?'
  }
}

const emptyForm = { title: '', description: '', price: '', currency: 'SAR' }
const emptyQuestion = () => ({ section: null, passage: null, stem: '', options: ['', ''], correctIndex: -1, needsReview: false })

export default function Exams({ lang }) {
  const l = labels[lang]
  const [exams, setExams] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [questions, setQuestions] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parseNote, setParseNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEditor, setShowEditor] = useState(false)

  const fetchExams = async () => {
    const snap = await getDocs(collection(db, 'exams'))
    setExams(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchExams() }, [])

  const resetForm = () => {
    setForm(emptyForm)
    setQuestions([])
    setEditingId(null)
    setParseNote('')
    setShowEditor(false)
  }

  const handleUpload = async (file) => {
    if (!file) return
    setParsing(true)
    setParseNote('')
    try {
      const { questions: parsed, needsReviewCount } = await parseExamDocx(file)
      setQuestions(prev => [...prev, ...parsed])
      setParseNote(l.parsedCount.replace('{n}', parsed.length).replace('{r}', needsReviewCount))
      setShowEditor(true)
    } catch (err) {
      alert(l.parseFailed)
    } finally {
      setParsing(false)
    }
  }

  const startAddExam = () => {
    resetForm()
    setShowEditor(true)
  }

  const startEditExam = async (exam) => {
    setLoading(true)
    try {
      const contentSnap = await getDoc(doc(db, 'examContent', exam.id))
      setForm({ title: exam.title || '', description: exam.description || '', price: exam.price ?? '', currency: exam.currency || 'SAR' })
      setQuestions(contentSnap.exists() ? (contentSnap.data().questions || []) : [])
      setEditingId(exam.id)
      setParseNote('')
      setShowEditor(true)
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteExam = async (id) => {
    if (!window.confirm(l.deleteConfirm)) return
    await deleteDoc(doc(db, 'exams', id))
    await deleteDoc(doc(db, 'examContent', id))
    if (editingId === id) resetForm()
    await fetchExams()
  }

  // ---- question editing helpers ----
  const updateQuestion = (qi, patch) => {
    setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, ...patch } : q))
  }
  const updateOption = (qi, oi, text) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qi) return q
      const options = q.options.map((o, j) => j === oi ? text : o)
      return { ...q, options }
    }))
  }
  const setCorrect = (qi, oi) => updateQuestion(qi, { correctIndex: oi, needsReview: false })
  const addOption = (qi) => setQuestions(prev => prev.map((q, i) =>
    i === qi && q.options.length < MAX_OPTIONS ? { ...q, options: [...q.options, ''] } : q))
  const removeOption = (qi, oi) => setQuestions(prev => prev.map((q, i) => {
    if (i !== qi || q.options.length <= 2) return q
    const options = q.options.filter((_, j) => j !== oi)
    let correctIndex = q.correctIndex
    if (oi === q.correctIndex) correctIndex = -1
    else if (oi < q.correctIndex) correctIndex -= 1
    return { ...q, options, correctIndex }
  }))
  const removeQuestion = (qi) => setQuestions(prev => prev.filter((_, i) => i !== qi))
  const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion()])

  const save = async () => {
    if (!form.title || questions.length === 0) return
    const invalid = questions.some(q => !q.stem.trim() || q.options.filter(o => o.trim()).length < 2 || q.correctIndex < 0)
    if (invalid) { alert(l.validationFailed); return }

    setLoading(true)
    try {
      const cleanQuestions = questions.map(q => ({
        section: q.section || null,
        passage: q.passage || null,
        stem: q.stem.trim(),
        options: q.options.map(o => o.trim()),
        correctIndex: q.correctIndex
      }))
      const examData = {
        title: form.title, description: form.description || '',
        price: Number(form.price) || 0, currency: form.currency,
        questionCount: cleanQuestions.length
      }
      let examId = editingId
      if (examId) {
        await updateDoc(doc(db, 'exams', examId), examData)
      } else {
        const ref = await addDoc(collection(db, 'exams'), { ...examData, createdAt: new Date() })
        examId = ref.id
      }
      await setDoc(doc(db, 'examContent', examId), { questions: cleanQuestions })
      resetForm()
      await fetchExams()
    } catch (err) {
      alert(l.saveFailed + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
          <Icon e="📝" className="w-7 h-7 inline-block align-[-0.3em]" /> {l.title}
        </h2>
        {!showEditor && (
          <button onClick={startAddExam}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg font-semibold transition">
            + {l.addExam}
          </button>
        )}
      </div>

      {showEditor && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 space-y-4">
          <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">
            {editingId ? l.editExam : l.addExam}
          </p>

          <label className="flex items-center gap-2 cursor-pointer text-indigo-600 dark:text-indigo-400 text-sm w-fit">
            <Icon e="📄" className="w-5 h-5 inline-block align-[-0.3em]" /> {parsing ? l.uploading : l.uploadDocx}
            <input type="file" accept=".docx" className="hidden" disabled={parsing}
              onChange={e => handleUpload(e.target.files[0])} />
          </label>
          {parseNote && (
            <p className="text-xs text-gold-700 dark:text-gold-400 bg-gold-50 dark:bg-gold-700/20 rounded-lg px-3 py-2">{parseNote}</p>
          )}

          <input className="input" placeholder={l.examTitle}
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <input className="input" placeholder={l.description}
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2">
            <input className="input flex-1" type="number" placeholder={l.price}
              value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            <select className="input flex-1" value={form.currency}
              onChange={e => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">
                {l.questions} ({questions.length})
              </p>
              <button onClick={addQuestion} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold">
                + {l.addQuestion}
              </button>
            </div>

            {questions.length === 0 && <p className="text-center text-gray-400 text-sm">{l.noQuestions}</p>}

            {questions.map((q, qi) => (
              <div key={qi} className={`rounded-xl border p-3 space-y-2 ${q.needsReview ? 'border-gold-400 bg-gold-50/50 dark:bg-gold-700/10' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {q.section && (
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full">{q.section}</span>
                    )}
                    {q.needsReview && (
                      <span className="text-[10px] bg-gold-100 dark:bg-gold-700/30 text-gold-700 dark:text-gold-400 px-2 py-0.5 rounded-full font-semibold">
                        <Icon e="⚠️" className="w-3.5 h-3.5 inline-block align-[-0.2em]" /> {l.needsReview}
                      </span>
                    )}
                  </div>
                  <button onClick={() => removeQuestion(qi)} className="text-red-400 hover:text-red-600 text-xs shrink-0">
                    {l.removeQuestion}
                  </button>
                </div>

                <textarea className="input text-sm" rows={2} placeholder={l.passage}
                  value={q.passage || ''} onChange={e => updateQuestion(qi, { passage: e.target.value || null })} />
                <textarea className="input text-sm font-medium" rows={2} placeholder={l.stem}
                  value={q.stem} onChange={e => updateQuestion(qi, { stem: e.target.value })} />

                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${qi}`} checked={q.correctIndex === oi}
                        onChange={() => setCorrect(qi, oi)} className="accent-green-600" title={l.markCorrect} />
                      <input className="input text-sm flex-1" value={opt}
                        onChange={e => updateOption(qi, oi, e.target.value)} />
                      {q.options.length > 2 && (
                        <button onClick={() => removeOption(qi, oi)} className="text-gray-300 hover:text-red-500 text-xs shrink-0">×</button>
                      )}
                    </div>
                  ))}
                  {q.options.length < MAX_OPTIONS && (
                    <button onClick={() => addOption(qi)} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold">
                      + {l.addOption}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={save} disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-lg font-semibold transition">
              {editingId ? l.update : l.save}
            </button>
            <button onClick={resetForm} disabled={loading}
              className="px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 rounded-lg font-semibold transition">
              {l.cancel}
            </button>
          </div>
        </div>
      )}

      {!showEditor && (
        <div className="space-y-3">
          <p className="font-semibold text-sm text-gray-500 dark:text-gray-400">{l.existingExams}</p>
          {exams.length === 0 && <p className="text-center text-gray-400 text-sm">{l.noExams}</p>}
          {exams.map(exam => (
            <div key={exam.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-gray-800 dark:text-white">{exam.title}</p>
                {exam.description && <p className="text-sm text-gray-500 dark:text-gray-400">{exam.description}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  {exam.questionCount || 0} {l.qCount} · <span className="text-gold-600 dark:text-gold-400 font-semibold">{exam.price} {exam.currency}</span>
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEditExam(exam)}
                  className="text-indigo-500 hover:text-indigo-700 text-xs px-3 py-1 rounded-lg border border-indigo-200 hover:border-indigo-400 transition">
                  {l.edit}
                </button>
                <button onClick={() => deleteExam(exam.id)}
                  className="text-red-400 hover:text-red-600 text-xs px-3 py-1 rounded-lg border border-red-200 hover:border-red-400 transition">
                  {l.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
