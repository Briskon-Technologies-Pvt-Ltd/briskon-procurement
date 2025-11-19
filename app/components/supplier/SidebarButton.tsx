const SidebarButton = ({
    icon,
    label,
    active = false,
  }: { icon: React.ReactNode; label: string; active?: boolean }) => (
    <button
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition ${
        active ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
      }`}
    >
      {icon} {label}
    </button>
  );
  
  export default SidebarButton;
  