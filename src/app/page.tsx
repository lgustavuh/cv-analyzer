"use client";

import { useAppState } from '@/hooks/useAppState';
import { AuthComponent } from '@/components/AuthComponent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { 
  User, 
  FileText, 
  Search, 
  Upload, 
  BarChart3, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  LogOut,
  RefreshCw,
  ExternalLink,
  FileDown,
  Target,
  TrendingUp,
  Award
} from 'lucide-react';
import { useState } from 'react';
import { 
  analyzeJobFromURL, 
  analyzeJobFromText, 
  analyzeCVFile, 
  calculateCompatibility,
  generateOptimizedCV 
} from '@/lib/nlp-utils';
import { JobInput } from '@/lib/types';

export default function CVAnalyzerApp() {
  const { state, setCurrentTab, login, logout, setJobAnalysis, setCVAnalysis, setMatchResult, updateUserProfile, resetAnalysis } = useAppState();
  const [isLoading, setIsLoading] = useState(false);
  const [jobInput, setJobInput] = useState<JobInput>({ type: 'url', value: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!state.isAuthenticated) {
    return <AuthComponent onLogin={login} />;
  }

  const tabs = [
    { id: 'welcome', label: 'Bem-vindo', icon: User },
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'job', label: 'Vaga', icon: Search },
    { id: 'cv', label: 'Currículo', icon: FileText },
    { id: 'analysis', label: 'Análise', icon: BarChart3 },
    { id: 'result', label: 'Resultado', icon: Target },
    { id: 'download', label: 'Download', icon: Download }
  ];

  const handleJobAnalysis = async () => {
    if (!jobInput.value.trim()) return;
    
    setIsLoading(true);
    try {
      const analysis = jobInput.type === 'url' 
        ? await analyzeJobFromURL(jobInput.value)
        : await analyzeJobFromText(jobInput.value);
      
      setJobAnalysis(analysis);
      setCurrentTab('cv');
    } catch (error) {
      console.error('Erro na análise da vaga:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCVAnalysis = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    try {
      const analysis = await analyzeCVFile(selectedFile);
      setCVAnalysis(analysis);
      setCurrentTab('analysis');
    } catch (error) {
      console.error('Erro na análise do currículo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMatch = () => {
    if (!state.jobAnalysis || !state.cvAnalysis) return;
    
    const result = calculateCompatibility(state.jobAnalysis, state.cvAnalysis);
    setMatchResult(result);
    setCurrentTab('result');
  };

  const handleDownload = (format: 'docx' | 'pdf') => {
    if (!state.jobAnalysis || !state.cvAnalysis) return;
    
    const blob = generateOptimizedCV(state.jobAnalysis, state.cvAnalysis, format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curriculo-otimizado.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                CV Analyzer
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Olá, {state.user?.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={resetAnalysis}
                className="text-gray-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Nova Análise
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={state.currentTab} onValueChange={(value) => setCurrentTab(value as any)}>
          {/* Navigation Tabs */}
          <TabsList className="grid w-full grid-cols-7 mb-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Welcome Tab */}
          <TabsContent value="welcome">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Bem-vindo ao CV Analyzer</CardTitle>
                <CardDescription>
                  Analise vagas, otimize seu currículo e aumente suas chances de seleção
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                      Como funciona
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                        <div>
                          <p className="font-medium">Analise a vaga</p>
                          <p className="text-sm text-gray-600">Cole a URL ou descrição da vaga desejada</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                        <div>
                          <p className="font-medium">Envie seu currículo</p>
                          <p className="text-sm text-gray-600">Upload do seu CV em PDF, DOC ou DOCX</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
                        <div>
                          <p className="font-medium">Receba a análise</p>
                          <p className="text-sm text-gray-600">Veja sua compatibilidade e pontos de melhoria</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">4</div>
                        <div>
                          <p className="font-medium">Baixe o CV otimizado</p>
                          <p className="text-sm text-gray-600">Currículo personalizado para a vaga e ATS</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Award className="w-5 h-5 mr-2 text-green-600" />
                      Limites e Recursos
                    </h3>
                    <div className="space-y-3">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Arquivos:</strong> Máximo 10 MB (PDF, DOC, DOCX)
                        </AlertDescription>
                      </Alert>
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Texto:</strong> Máximo 25.000 caracteres por descrição
                        </AlertDescription>
                      </Alert>
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Análise NLP:</strong> Extração inteligente de skills e requisitos
                        </AlertDescription>
                      </Alert>
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>ATS Ready:</strong> Currículos otimizados para sistemas de recrutamento
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                </div>
                
                <div className="text-center pt-6">
                  <Button 
                    onClick={() => setCurrentTab('profile')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Começar Análise
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Perfil do Usuário</CardTitle>
                <CardDescription>
                  Informações que serão usadas no currículo otimizado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Nome completo</Label>
                    <Input
                      id="profile-name"
                      value={state.userProfile.name}
                      onChange={(e) => updateUserProfile({ name: e.target.value })}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">E-mail</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={state.userProfile.email}
                      onChange={(e) => updateUserProfile({ email: e.target.value })}
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-phone">Telefone</Label>
                    <Input
                      id="profile-phone"
                      value={state.userProfile.phone}
                      onChange={(e) => updateUserProfile({ phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-education">Formação</Label>
                    <Input
                      id="profile-education"
                      value={state.userProfile.education}
                      onChange={(e) => updateUserProfile({ education: e.target.value })}
                      placeholder="Sua formação acadêmica"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-activities">Atividades Complementares</Label>
                  <Textarea
                    id="profile-activities"
                    value={state.userProfile.extraActivities}
                    onChange={(e) => updateUserProfile({ extraActivities: e.target.value })}
                    placeholder="Cursos, certificações, projetos pessoais..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setCurrentTab('job')}>
                    Próximo: Analisar Vaga
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Job Analysis Tab */}
          <TabsContent value="job">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Vaga</CardTitle>
                <CardDescription>
                  Cole a URL da vaga ou a descrição completa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={jobInput.type} onValueChange={(value) => setJobInput(prev => ({ ...prev, type: value as 'url' | 'text' }))}>
                  <TabsList>
                    <TabsTrigger value="url">URL da Vaga</TabsTrigger>
                    <TabsTrigger value="text">Descrição Completa</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="url" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="job-url">URL da vaga</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="job-url"
                          type="url"
                          placeholder="https://empresa.com/vaga"
                          value={jobInput.value}
                          onChange={(e) => setJobInput(prev => ({ ...prev, value: e.target.value }))}
                        />
                        <Button
                          onClick={handleJobAnalysis}
                          disabled={isLoading || !jobInput.value.trim()}
                        >
                          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="text" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="job-text">Descrição da vaga</Label>
                      <Textarea
                        id="job-text"
                        placeholder="Cole aqui a descrição completa da vaga..."
                        rows={10}
                        value={jobInput.value}
                        onChange={(e) => setJobInput(prev => ({ ...prev, value: e.target.value }))}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {jobInput.value.length}/25000 caracteres
                        </span>
                        <Button
                          onClick={handleJobAnalysis}
                          disabled={isLoading || !jobInput.value.trim()}
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                              Analisando...
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4 mr-2" />
                              Analisar Vaga
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {state.jobAnalysis && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Vaga analisada com sucesso! Prossiga para o upload do currículo.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CV Upload Tab */}
          <TabsContent value="cv">
            <Card>
              <CardHeader>
                <CardTitle>Upload do Currículo</CardTitle>
                <CardDescription>
                  Envie seu currículo em PDF, DOC ou DOCX (máximo 10 MB)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <Label htmlFor="cv-upload" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700 font-medium">
                        Clique para selecionar
                      </span>
                      <span className="text-gray-600"> ou arraste seu arquivo aqui</span>
                    </Label>
                    <Input
                      id="cv-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-sm text-gray-500">
                      Formatos aceitos: PDF, DOC, DOCX
                    </p>
                  </div>
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-gray-600">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleCVAnalysis}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Analisar CV
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {state.cvAnalysis && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Currículo analisado com sucesso! Seu perfil foi atualizado automaticamente.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Comparação: Vaga × Currículo</CardTitle>
                  <CardDescription>
                    Análise detalhada dos requisitos e suas qualificações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {state.jobAnalysis && state.cvAnalysis ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Job Analysis */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-blue-600">📋 Vaga</h3>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium">Cargo</h4>
                            <p className="text-gray-600">{state.jobAnalysis.job.title}</p>
                          </div>
                          <div>
                            <h4 className="font-medium">Localização</h4>
                            <p className="text-gray-600">{state.jobAnalysis.job.location}</p>
                          </div>
                          <div>
                            <h4 className="font-medium">Modelo de Trabalho</h4>
                            <Badge variant="outline">{state.jobAnalysis.job.workModel}</Badge>
                          </div>
                          <div>
                            <h4 className="font-medium">Requisitos Obrigatórios</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {state.jobAnalysis.sections.requirements_must.map((skill, index) => (
                                <Badge key={index} variant="destructive" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium">Requisitos Desejáveis</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {state.jobAnalysis.sections.requirements_nice.map((skill, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CV Analysis */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-green-600">👤 Seu Perfil</h3>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium">Nome</h4>
                            <p className="text-gray-600">{state.cvAnalysis.candidate.name}</p>
                          </div>
                          <div>
                            <h4 className="font-medium">Formação</h4>
                            <p className="text-gray-600">{state.cvAnalysis.candidate.education}</p>
                          </div>
                          <div>
                            <h4 className="font-medium">Suas Skills</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {state.cvAnalysis.sections.skills.map((skill, index) => (
                                <Badge key={index} variant="default" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium">Experiência</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {state.cvAnalysis.sections.experience.map((exp, index) => (
                                <li key={index}>• {exp}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        Complete a análise da vaga e upload do currículo para ver a comparação
                      </p>
                    </div>
                  )}
                </CardContent>
                {state.jobAnalysis && state.cvAnalysis && (
                  <div className="px-6 pb-6">
                    <Button onClick={handleMatch} className="w-full">
                      <Target className="w-4 h-4 mr-2" />
                      Calcular Compatibilidade
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="result">
            <div className="space-y-6">
              {state.matchResult ? (
                <>
                  {/* Compatibility Score */}
                  <Card>
                    <CardHeader className="text-center">
                      <CardTitle>Compatibilidade com a Vaga</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center space-x-8">
                        <div className="w-32 h-32">
                          <CircularProgressbar
                            value={state.matchResult.compatibility}
                            text={`${state.matchResult.compatibility}%`}
                            styles={buildStyles({
                              textSize: '16px',
                              pathColor: state.matchResult.compatibility >= 80 ? '#10b981' : 
                                        state.matchResult.compatibility >= 60 ? '#f59e0b' : '#ef4444',
                              textColor: '#374151',
                              trailColor: '#e5e7eb',
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={state.matchResult.atsProbability === 'Alta' ? 'default' : 
                                      state.matchResult.atsProbability === 'Média' ? 'secondary' : 'destructive'}
                            >
                              Probabilidade ATS: {state.matchResult.atsProbability}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 max-w-md">
                            {state.matchResult.rationale}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Skills Analysis */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-green-600 flex items-center">
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Skills Compatíveis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Requisitos Obrigatórios ✅</h4>
                          <div className="flex flex-wrap gap-1">
                            {state.matchResult.matched.must.map((skill, index) => (
                              <Badge key={index} variant="default" className="bg-green-100 text-green-800">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Requisitos Desejáveis ✅</h4>
                          <div className="flex flex-wrap gap-1">
                            {state.matchResult.matched.nice.map((skill, index) => (
                              <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-red-600 flex items-center">
                          <XCircle className="w-5 h-5 mr-2" />
                          Skills em Falta
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Requisitos Obrigatórios ❌</h4>
                          <div className="flex flex-wrap gap-1">
                            {state.matchResult.missing.must.map((skill, index) => (
                              <Badge key={index} variant="destructive">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                          {state.matchResult.missing.must.length === 0 && (
                            <p className="text-sm text-green-600">Todos os requisitos obrigatórios atendidos! 🎉</p>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Requisitos Desejáveis ❌</h4>
                          <div className="flex flex-wrap gap-1">
                            {state.matchResult.missing.nice.map((skill, index) => (
                              <Badge key={index} variant="outline" className="border-orange-300 text-orange-700">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Keywords Analysis */}
                  {state.jobAnalysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Palavras-chave da Vaga</CardTitle>
                        <CardDescription>
                          Termos mais relevantes encontrados na descrição
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {state.jobAnalysis.analytics.topKeywords.map((keyword, index) => (
                            <Badge key={index} variant="outline" className="text-sm">
                              {keyword.term} ({Math.round(keyword.weight * 100)}%)
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="text-center">
                    <Button 
                      onClick={() => setCurrentTab('download')}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      Baixar Currículo Otimizado
                    </Button>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Complete a análise para ver os resultados de compatibilidade
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Download Tab */}
          <TabsContent value="download">
            <Card>
              <CardHeader>
                <CardTitle>Download do Currículo Otimizado</CardTitle>
                <CardDescription>
                  Baixe seu currículo personalizado para a vaga e otimizado para ATS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {state.jobAnalysis && state.cvAnalysis ? (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">✨ Otimizações Aplicadas:</h3>
                      <ul className="text-sm space-y-1 text-gray-700">
                        <li>• Resumo profissional personalizado para a vaga</li>
                        <li>• Skills priorizadas conforme requisitos</li>
                        <li>• Formato ATS-friendly (sem colunas complexas)</li>
                        <li>• Palavras-chave estratégicas incluídas</li>
                        <li>• Layout limpo e profissional</li>
                      </ul>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <Button
                        onClick={() => handleDownload('docx')}
                        className="h-16 flex flex-col items-center justify-center space-y-1"
                        variant="outline"
                      >
                        <FileDown className="w-6 h-6" />
                        <span>Baixar DOCX</span>
                        <span className="text-xs text-gray-500">Editável no Word</span>
                      </Button>
                      
                      <Button
                        onClick={() => handleDownload('pdf')}
                        className="h-16 flex flex-col items-center justify-center space-y-1"
                        variant="outline"
                      >
                        <FileDown className="w-6 h-6" />
                        <span>Baixar PDF</span>
                        <span className="text-xs text-gray-500">Pronto para envio</span>
                      </Button>
                    </div>

                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Dica:</strong> Use o arquivo DOCX para fazer ajustes finais e o PDF para enviar às empresas.
                      </AlertDescription>
                    </Alert>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <FileDown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Complete a análise da vaga e currículo para gerar os arquivos otimizados
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}