# adapted from http://www.collectivedisorder.com/ubuntu
(
# install everything
apt-get --assume-yes update
apt-get --assume-yes install uwsgi
apt-get --assume-yes install nginx
apt-get --assume-yesinstall uwsgi-plugin-python
apt-get --assume-yes install python-pip

# setup app
pip install virtualenv
mkdir /var/www/
cd /var/www
git clone https://github.com/aaronlidman/parks-project.git
cd parks-project

# install flask
virtualenv ./env
source env/bin/activate
pip install Flask
deactivate

# setup permissions
usermod -a -G www-data $USER
chown -R $USER:www-data /var/www/parks-project
chmod -R g+w /var/www/parks-project

# config nginx
ln -s /var/www/parks-project/nginx.conf /etc/nginx/sites-enabled/osmly
service nginx restart

# config uwsgi
ln -s /var/www/parks-project/nginx.conf /etc/uwsgi/apps-enabled/osmly.ini
service uwsgi restart

) >> /var/log/osmly.log 2>&1