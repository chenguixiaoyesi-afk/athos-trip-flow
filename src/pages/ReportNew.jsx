import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, BedDouble, Globe, MapPin, ChevronRight } from 'lucide-react';
import DayTripForm from '@/components/forms/DayTripForm';
import OvernightTripForm from '@/components/forms/OvernightTripForm';
import OverseasTripForm from '@/components/forms/OverseasTripForm';
import FieldworkForm from '@/components/forms/FieldworkForm';

const REPORT_TYPES = [
  {
    id: '日帰り出張',
    label: '日帰り出張',
    desc: '日帰りで行った出張',
    icon: Plane,
    color: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
  },
  {
    id: '宿泊出張',
    label: '宿泊出張',
    desc: '1泊以上の国内出張',
    icon: BedDouble,
    color: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
  },
  {
    id: '海外出張',
    label: '海外出張',
    desc: '海外への出張',
    icon: Globe,
    color: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
  },
  {
    id: '外出作業',
    label: '外出作業',
    desc: '4時間以上の外出作業',
    icon: MapPin,
    color: 'from-teal-500 to-teal-600',
    bg: 'bg-teal-50 hover:bg-teal-100 border-teal-200',
  },
];

export default function ReportNew() {
  const [selectedType, setSelectedType] = useState(null);
  const navigate = useNavigate();

  if (selectedType === '日帰り出張') return <DayTripForm onBack={() => setSelectedType(null)} />;
  if (selectedType === '宿泊出張') return <OvernightTripForm onBack={() => setSelectedType(null)} />;
  if (selectedType === '海外出張') return <OverseasTripForm onBack={() => setSelectedType(null)} />;
  if (selectedType === '外出作業') return <FieldworkForm onBack={() => setSelectedType(null)} />;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">新規レポート作成</h1>
        <p className="text-muted-foreground text-sm mt-1">レポートの種別を選択してください</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REPORT_TYPES.map(type => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all duration-200 ${type.bg}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{type.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{type.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}