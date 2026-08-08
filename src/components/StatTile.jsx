import Icon from './Icon'

const COLOR_CLASSES = {
  green: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
}

export default function StatTile({ icon, label, value, color = 'indigo' }) {
  return (
    <div className={`rounded-2xl p-4 text-center ${COLOR_CLASSES[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1">
        <Icon e={icon} className="w-4 h-4 inline-block align-[-0.25em]" /> {label}
      </div>
    </div>
  )
}
