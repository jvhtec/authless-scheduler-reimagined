import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, FileSpreadsheet, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SoundTaskDialog from '@/components/sound/SoundTaskDialog';
import PdfAnalysis from '@/components/sound/PdfAnalysis';
import ReportGenerator from '@/components/sound/ReportGenerator';

const Sound = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tools</h3>
              <div className="grid grid-cols-1 gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => navigate('/pesos-tool')}
                >
                  <Calculator className="h-6 w-6" />
                  <span>Weight Calculator</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => navigate('/consumos-tool')}
                >
                  <Zap className="h-6 w-6" />
                  <span>Power Calculator</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => navigate('/excel-tool')}
                >
                  <FileSpreadsheet className="h-6 w-6" />
                  <span>Excel Generator</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tasks</h3>
              <SoundTaskDialog />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Reports</h3>
              <div className="space-y-4">
                <PdfAnalysis />
                <ReportGenerator />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Sound;