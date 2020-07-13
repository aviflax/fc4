FROM tomcat:8.5.56-jdk11-openjdk

# This is apparently how you add/use a required argument to a Dockerfile. Yuck.
# Not sure the ENV is necessary but it makes my linter happy.
ARG structurizr_license_key
ENV structurizr_license_key $structurizr_license_key
RUN test -n "$structurizr_license_key"

# As per https://hub.docker.com/r/structurizr/tomcat
RUN rm -rvf /usr/local/tomcat/webapps \
      && mkdir /usr/local/tomcat/webapps

RUN curl -O --silent --show-error https://structurizr-onpremises.s3.amazonaws.com/structurizr-onpremises-1986-file.war \
      && mv structurizr-onpremises-1986-file.war /usr/local/tomcat/webapps/ROOT.war

RUN mkdir /usr/local/structurizr \
      && echo "structurizr.license=$structurizr_license_key" >> /usr/local/structurizr/structurizr.properties

EXPOSE 8080
