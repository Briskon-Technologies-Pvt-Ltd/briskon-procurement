const KPI = ({
    title,
    value,
    icon,
  }: { title: string; value: string | number; icon: React.ReactNode }) => (
    <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-5 shadow hover:border-indigo-500 transition">
      <div className="flex items-center gap-2 opacity-80 mb-1">
        {icon}
        <span className="text-sm">{title}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
  
  export default KPI;
  