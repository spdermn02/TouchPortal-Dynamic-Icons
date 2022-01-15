#!/bin/sh

########################################################################
##
## Used to start the Plugin on Mac or Linux due to needing the execute
## permission and sometimes it not being retained properly while zipped
##
########################################################################

# the program you want to run
prog=$1

# give ourselves the execute permission on the program
chmod +x $prog

# Need to validate it isn't still running if it is, kill it so we can restart it.
pid=`ps -ef | grep -v grep | grep -i "\./${prog}" | awk '{print $2}'`

if [[ "x$pid" != "x" && $pid -gt 0 ]]
then
	echo "`date +"%F %T%Z"`: ${prog} already running, killing it to start again"
        kill -9 $pid
	sleep 1
fi

# this will output all Plugin log data to the TouchPortal/plugins/<prog> directory 
# in a file called <prog>log.txt instead of being captured inside the Touch Portal Logs
./$prog > ${prog}log.txt 2>&1 &