import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArtistTable } from "@/components/festival/ArtistTable";

const FestivalManagement = () => {
  const { jobId } = useParams();

  if (!jobId) {
    return <div>Job ID is required</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
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

export default FestivalManagement;