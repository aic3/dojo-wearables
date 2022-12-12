#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/azure-functions/dotnet:4 AS base
WORKDIR /home/site/wwwroot
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src
COPY ["dojo-speech-svc/dojo-speech-svc.csproj", "dojo-speech-svc/"]
RUN dotnet restore "dojo-speech-svc/dojo-speech-svc.csproj"
COPY . .
WORKDIR "/src/dojo-speech-svc"
RUN dotnet build "dojo-speech-svc.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "dojo-speech-svc.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
# error running speech services on linux containers
# ref: https://github.com/Azure-Samples/cognitive-services-speech-sdk/issues/1771 
# System.Private.CoreLib: Exception while executing function: ConvertTextToSpeech. Microsoft.CognitiveServices.Speech.csharp: Unable to load shared library 'libMicrosoft.CognitiveServices.Speech.core.so'

# https://github.com/Azure-Samples/cognitive-services-speech-sdk/issues/143
RUN apt-get update
RUN apt-get -y install build-essential libssl1.0.0 libasound2 wget

WORKDIR /home/site/wwwroot
COPY --from=publish /app/publish .
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true