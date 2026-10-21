FROM python:3.12-slim

WORKDIR /usr/src/app

COPY writer.py .
COPY server.py .

RUN mkdir -p /usr/src/app/files

ENV PORT=3000

EXPOSE 3000

CMD ["python", "server.py"]