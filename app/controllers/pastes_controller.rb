class PastesController < ApplicationController
  def new
    @paste = Paste.new
  end

  def create
    @paste = Paste.new(params.permit(:paste))
    if @paste.save
      respond_to do |format|
        format.js
      end
    end
  end

  def show
  end

  def burn
  end
end
