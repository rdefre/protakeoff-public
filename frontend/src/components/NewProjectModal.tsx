import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from './ui/dialog';
import { open } from '@tauri-apps/plugin-dialog';
import { FileSelectionView } from './FileSelectionView';
import { Spinner } from './ui/spinner';

export const NewProjectModal: React.FC = () => {
    const showNewProjectWizard = useProjectStore(useCallback(s => s.showNewProjectWizard, []));
    const setShowNewProjectWizard = useProjectStore(useCallback(s => s.setShowNewProjectWizard, []));
    const createProject = useProjectStore(useCallback(s => s.createProject, []));
    const uploadPdfs = useProjectStore(useCallback(s => s.uploadPdfs, []));
    const saveProjectAs = useProjectStore(useCallback(s => s.saveProjectAs, []));
    const setShowWelcomeModal = useProjectStore(useCallback(s => s.setShowWelcomeModal, []));

    const [wizardStep, setWizardStep] = useState<'name' | 'files'>('name');
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const [projectName, setProjectName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset wizard when dialog opens
    useEffect(() => {
        if (showNewProjectWizard) {
            setWizardStep('name');
            setProjectName('');
            setSelectedPaths([]);
            setIsProcessing(false);
        }
    }, [showNewProjectWizard]);

    const handleAddFiles = async () => {
        try {
            const selected = await open({
                multiple: true,
                filters: [{ name: 'PDF', extensions: ['pdf'] }]
            });
            if (selected) {
                const newPaths = Array.isArray(selected) ? selected : [selected];
                // Avoid duplicates
                const unique = [...new Set([...selectedPaths, ...newPaths])];
                setSelectedPaths(unique);
            }
        } catch (err) {
            console.error('File selection error:', err);
        }
    };

    const handleRemoveFile = (pathToRemove: string) => {
        setSelectedPaths(prev => prev.filter(p => p !== pathToRemove));
    };

    const handleCreateProject = async () => {
        if (isProcessing) return;
        setIsProcessing(true);

        try {
            createProject(projectName.trim());

            if (selectedPaths.length > 0) {
                const mockFiles = selectedPaths.map(path => ({
                    path,
                    name: path.split(/[\\/]/).pop() || 'document.pdf'
                }));
                await uploadPdfs(mockFiles);
            }

            // Enforce file association: Prompt to save immediately
            // This ensures every project is backed by a .ptf file
            await saveProjectAs();

            setShowNewProjectWizard(false);
            // Also close welcome modal if it was open
            setShowWelcomeModal(false);
        } catch (error) {
            console.error("Failed to create project:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={showNewProjectWizard} onOpenChange={setShowNewProjectWizard}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{wizardStep === 'name' ? 'Create New Project' : 'Add Documents'}</DialogTitle>
                    <DialogDescription>
                        {wizardStep === 'name'
                            ? 'Enter a name for your new takeoff project.'
                            : 'Select PDF drawings to include in this project.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {wizardStep === 'name' ? (
                        <Input
                            autoFocus
                            placeholder="e.g. Residential Complex B"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setWizardStep('files')}
                        />
                    ) : (
                        <FileSelectionView
                            selectedPaths={selectedPaths}
                            onAddFiles={handleAddFiles}
                            onRemoveFile={handleRemoveFile}
                        />
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    {/* Back / Cancel */}
                    {wizardStep === 'files' ? (
                        <Button variant="ghost" onClick={() => setWizardStep('name')}>Back</Button>
                    ) : (
                        <Button variant="ghost" onClick={() => setShowNewProjectWizard(false)}>Cancel</Button>
                    )}

                    {/* Next / Create */}
                    {wizardStep === 'name' ? (
                        <Button onClick={() => setWizardStep('files')} disabled={!projectName.trim()}>
                            Next
                            <ChevronRight size={16} className="ml-1" />
                        </Button>
                    ) : (
                        <Button onClick={handleCreateProject} disabled={isProcessing}>
                            {isProcessing ? (
                                <>
                                    <Spinner className="size-4 mr-2" />
                                    Creating...
                                </>
                            ) : (
                                selectedPaths.length > 0 ? `Create with ${selectedPaths.length} Files` : 'Skip & Create'
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
