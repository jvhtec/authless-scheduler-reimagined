import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { ArtistTable } from "@/components/festival/ArtistTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FestivalArtistManagement = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();

  if (!jobId) {
    return <div>Job ID is required</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate(`/festival-management/${jobId}`)}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Festival Management
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Festival Artist Management</CardTitle>
        </CardHeader>
        <CardContent>
          <ArtistTable jobId={jobId} />
        </CardContent>
      </Card>
    </div>
  );
};

export default FestivalArtistManagement;