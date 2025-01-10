// [Previous imports remain the same...]

export const SoundTaskDialog = ({ jobId, open, onOpenChange }: SoundTaskDialogProps) => {
  // [Previous state and queries remain the same...]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-2 flex flex-row items-center justify-between border-b">
          <DialogTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            <span>Sound Department Tasks</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={createFlexFolders}
              disabled={!jobDetails || jobDetails.flex_folders_created}
              className="hover:bg-gray-100 group relative"
            >
              <img
                src={createFolderIcon}
                alt="Create Flex Folders"
                className="h-6 w-6"
              />
              <span className="absolute -bottom-8 scale-0 transition-all rounded bg-gray-800 p-2 text-xs text-white group-hover:scale-100 whitespace-nowrap">
                {jobDetails?.flex_folders_created ? "Folders already created" : "Create Flex Folders"}
              </span>
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {/* Personnel Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>FOH Engineers Required</Label>
                <Input
                  type="number"
                  min="0"
                  value={personnel?.foh_engineers || 0}
                  onChange={(e) => updatePersonnel('foh_engineers', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label>MON Engineers Required</Label>
                <Input
                  type="number"
                  min="0"
                  value={personnel?.mon_engineers || 0}
                  onChange={(e) => updatePersonnel('mon_engineers', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label>PA Techs Required</Label>
                <Input
                  type="number"
                  min="0"
                  value={personnel?.pa_techs || 0}
                  onChange={(e) => updatePersonnel('pa_techs', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label>RF Techs Required</Label>
                <Input
                  type="number"
                  min="0"
                  value={personnel?.rf_techs || 0}
                  onChange={(e) => updatePersonnel('rf_techs', parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Tasks Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-medium">Total Progress:</span>
                <div className="flex-1">
                  <Progress 
                    value={calculateTotalProgress()} 
                    className="h-2"
                  />
                </div>
                <span className="text-sm">{calculateTotalProgress()}%</span>
              </div>

              <div className="overflow-x-auto">
                <UITable>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[15%]">Task</TableHead>
                      <TableHead className="w-[20%]">Assigned To</TableHead>
                      <TableHead className="w-[15%]">Status</TableHead>
                      <TableHead className="w-[15%]">Progress</TableHead>
                      <TableHead className="w-[20%]">Documents</TableHead>
                      <TableHead className="w-[15%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TASK_TYPES.map((taskType) => {
                      const task = tasks?.find(t => t.task_type === taskType);
                      return (
                        <TableRow key={taskType}>
                          <TableCell className="font-medium truncate max-w-[100px]">
                            {taskType}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={task?.assigned_to?.id || ""}
                              onValueChange={async (value) => {
                                if (!task) {
                                  const { error } = await supabase
                                    .from('sound_job_tasks')
                                    .insert({
                                      job_id: jobId,
                                      task_type: taskType,
                                      assigned_to: value,
                                    });
                                  if (error) throw error;
                                } else {
                                  const { error } = await supabase
                                    .from('sound_job_tasks')
                                    .update({ assigned_to: value })
                                    .eq('id', task.id);
                                  if (error) throw error;
                                }
                                refetchTasks();
                              }}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Assign to..." />
                              </SelectTrigger>
                              <SelectContent>
                                {managementUsers?.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.first_name} {user.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {task && (
                              <Select
                                value={task.status}
                                onValueChange={(value) => updateTaskStatus(task.id, value)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="not_started">Not Started</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {task && (
                              <div className="flex items-center gap-1">
                                <Progress 
                                  value={task.progress} 
                                  className={`h-2 ${getProgressColor(task.status)}`}
                                />
                                <span className="text-xs w-7">{task.progress}%</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="max-h-[60px] overflow-y-auto">
                              {task?.task_documents?.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between p-1 text-xs"
                                >
                                  <span className="truncate max-w-[100px]" title={doc.file_name}>
                                    {doc.file_name}
                                  </span>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => handleDownload(doc.file_path, doc.file_name)}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => handleDeleteFile(task.id, doc.id, doc.file_path)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {task && (
                              <div className="relative">
                                <input
                                  type="file"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(task.id, file);
                                  }}
                                  disabled={uploading}
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  disabled={uploading}
                                  className="w-[100px]"
                                >
                                  <Upload className="h-3 w-3 mr-1" />
                                  Upload
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </UITable>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
