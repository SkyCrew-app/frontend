'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_MODULES, GET_EVALUATIONS, CREATE_EVALUATION, CREATE_QUESTION, UPDATE_EVALUATION, UPDATE_QUESTION, DELETE_EVALUATION, DELETE_QUESTION } from '@/graphql/learningAdmin';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Check, Book, HelpCircle, Edit } from 'lucide-react';
import { toast } from "@/components/hooks/use-toast";

export function EvaluationManagement() {
  const [step, setStep] = useState(1);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [passScore, setPassScore] = useState('');
  const [questionContent, setQuestionContent] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [selectedEvaluationId, setSelectedEvaluationId] = useState('');
  const [editingEvaluation, setEditingEvaluation] = useState<any>(null);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);

  const { data: modulesData } = useQuery(GET_MODULES);
  const { data: evaluationsData, loading, error: queryError, refetch: refetchEvaluations } = useQuery(GET_EVALUATIONS);

  const [createEvaluation] = useMutation(CREATE_EVALUATION, {
    onCompleted: (data) => {
      if (data && data.createEvaluation && data.createEvaluation.id) {
        setSelectedEvaluationId(data.createEvaluation.id);
        setStep(2);
        toast({ title: "Évaluation créée", description: "Vous pouvez maintenant ajouter des questions." });
      }
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const [createQuestion] = useMutation(CREATE_QUESTION, {
    onCompleted: () => {
      setQuestionContent('');
      setOptions(['', '']);
      setCorrectAnswer('');
      refetchEvaluations();
      toast({ title: "Question ajoutée", description: "La question a été ajoutée à l'évaluation." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const [updateEvaluation] = useMutation(UPDATE_EVALUATION, {
    onCompleted: () => {
      refetchEvaluations();
      toast({ title: "Évaluation mise à jour", description: "Les modifications ont été enregistrées." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const [updateQuestion] = useMutation(UPDATE_QUESTION, {
    onCompleted: () => {
      refetchEvaluations();
      toast({ title: "Question mise à jour", description: "Les modifications ont été enregistrées." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const [deleteEvaluation] = useMutation(DELETE_EVALUATION, {
    onCompleted: () => {
      refetchEvaluations();
      toast({ title: "Évaluation supprimée", description: "L'évaluation a été supprimée avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const [deleteQuestion] = useMutation(DELETE_QUESTION, {
    onCompleted: () => {
      refetchEvaluations();
      toast({ title: "Question supprimée", description: "La question a été supprimée avec succès." });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEvaluation({
      variables: {
        createEvaluationInput: {
          moduleId: parseInt(selectedModuleId),
          pass_score: parseInt(passScore),
        },
      },
    });
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    await createQuestion({
      variables: {
        createQuestionInput: {
          evaluationId: parseInt(selectedEvaluationId),
          content: { text: questionContent },
          options: options.filter(option => option.trim() !== ''),
          correct_answer: correctAnswer,
        },
      },
    });
  };

  const handleUpdateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateEvaluation({
      variables: {
        updateEvaluationInput: {
          id: editingEvaluation.id,
          pass_score: parseInt(editingEvaluation.pass_score),
        },
      },
    });
    setEditingEvaluation(null);
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateQuestion({
      variables: {
        updateQuestionInput: {
          id: editingQuestion.id,
          content: { text: editingQuestion.content.text },
          options: editingQuestion.options,
          correct_answer: editingQuestion.correct_answer,
        },
      },
    });
    setEditingQuestion(null);
  };

  const handleDeleteEvaluation = async (id: string) => {
    await deleteEvaluation({
      variables: { id: parseInt(id) },
    });
  };

  const handleDeleteQuestion = async (id: string) => {
    await deleteQuestion({
      variables: { id: parseInt(id) },
    });
  };

  const addOption = () => setOptions([...options, '']);
  const removeOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  if (loading) return <p>Chargement...</p>;
  if (queryError) return <p>Erreur : {queryError.message}</p>;

  return (
    <Tabs defaultValue="view">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="create">Créer</TabsTrigger>
        <TabsTrigger value="view">Voir les évaluations</TabsTrigger>
      </TabsList>

      <TabsContent value="create">
        <Card>
          <CardHeader>
            <CardTitle>Créer une évaluation</CardTitle>
            <CardDescription>Suivez les étapes pour créer une évaluation et ajouter des questions</CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <form onSubmit={handleCreateEvaluation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="module">Module</Label>
                  <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                    <SelectTrigger id="module">
                      <SelectValue placeholder="Sélectionner un module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modulesData?.getAllModules.map((module: any) => (
                        <SelectItem key={module.id} value={module.id.toString()}>
                          {module.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passScore">Score de réussite</Label>
                  <Input
                    id="passScore"
                    type="number"
                    value={passScore}
                    onChange={(e) => setPassScore(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit">Créer l'évaluation</Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleCreateQuestion} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="questionContent">Question</Label>
                  <Textarea
                    id="questionContent"
                    value={questionContent}
                    onChange={(e) => setQuestionContent(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Options de réponse</Label>
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        required
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => removeOption(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" onClick={addOption} variant="outline">
                    Ajouter une option
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Réponse correcte</Label>
                  <RadioGroup value={correctAnswer} onValueChange={setCorrectAnswer}>
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`}>{option || `Option ${index + 1}`}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <Button type="submit">Ajouter la question</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="view">
        <ScrollArea className="h-[calc(100vh-10rem)] w-full pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evaluationsData?.getEvaluations.map((evaluation: any) => (
              <Card key={evaluation.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Book className="w-5 h-5 mr-2" />
                      {evaluation.module?.title}
                    </span>
                    <Badge variant="secondary">
                      {evaluation.questions.length} {evaluation.questions.length === 1 ? 'question' : 'questions'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Score de réussite : {evaluation.pass_score}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={evaluation.pass_score} className="w-full" />
                </CardContent>
                <CardFooter className="mt-auto flex justify-between">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Voir les questions
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Questions de l'évaluation : {evaluation.module?.title}</DialogTitle>
                        <DialogDescription>
                          Score de réussite : {evaluation.pass_score}% | {evaluation.questions.length} questions
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        {evaluation.questions.map((question: any, index: number) => (
                          <Card key={question.id}>
                            <CardHeader>
                              <CardTitle className="text-lg flex justify-between items-center">
                                <span>Question {index + 1}</span>
                                <div>
                                  <Button variant="ghost" size="sm" onClick={() => setEditingQuestion(question)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette question ?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Cette action ne peut pas être annulée. Cela supprimera définitivement la question de l'évaluation.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteQuestion(question.id)}>Supprimer</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="mb-2 font-medium">{question.content.text}</p>
                              <ul className="list-disc list-inside space-y-1">
                                {question.options.map((option: string, optionIndex: number) => (
                                  <li key={optionIndex} className="flex items-center">
                                    <span>{option}</span>
                                    {option === question.correct_answer && (
                                      <Check className="w-4 h-4 ml-2 text-green-500" />
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => setEditingEvaluation(evaluation)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-2">
                          <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                          Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette évaluation ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action ne peut pas être annulée. Cela supprimera définitivement l'évaluation et toutes ses questions associées.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteEvaluation(evaluation.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      {editingEvaluation && (
        <Dialog open={!!editingEvaluation} onOpenChange={() => setEditingEvaluation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'évaluation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateEvaluation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editPassScore">Score de réussite</Label>
                <Input
                  id="editPassScore"
                  type="number"
                  value={editingEvaluation.pass_score}
                  onChange={(e) => setEditingEvaluation({...editingEvaluation, pass_score: e.target.value})}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">Enregistrer les modifications</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {editingQuestion && (
        <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier la question</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateQuestion} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editQuestionContent">Question</Label>
                <Textarea
                  id="editQuestionContent"
                  value={editingQuestion.content.text}
                  onChange={(e) => setEditingQuestion({...editingQuestion, content: {...editingQuestion.content, text: e.target.value}})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Options de réponse</Label>
                {editingQuestion.options.map((option: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...editingQuestion.options];
                        newOptions[index] = e.target.value;
                        setEditingQuestion({...editingQuestion, options: newOptions});
                      }}
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => {
                      const newOptions = editingQuestion.options.filter((_: string, i: number) => i !== index);
                      setEditingQuestion({...editingQuestion, options: newOptions});
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" onClick={() => setEditingQuestion({...editingQuestion, options: [...editingQuestion.options, '']})} variant="outline">
                  Ajouter une option
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Réponse correcte</Label>
                <RadioGroup value={editingQuestion.correct_answer} onValueChange={(value) => setEditingQuestion({...editingQuestion, correct_answer: value})}>
                  {editingQuestion.options.map((option: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`editOption-${index}`} />
                      <Label htmlFor={`editOption-${index}`}>{option || `Option ${index + 1}`}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <DialogFooter>
                <Button type="submit">Enregistrer les modifications</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Tabs>
  );
}
