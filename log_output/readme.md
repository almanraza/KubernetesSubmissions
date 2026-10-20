# log_output

Generates a random UUID on startup and prints it with a timestamp every 5 seconds.

## Run
docker build -t log-output:1.1 .
k3d image import log-output:1.1 -c mycluster
kubectl apply -f manifests/deployment.yaml
kubectl logs -f deployment/log-output
